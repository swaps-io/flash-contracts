import { ethers } from 'hardhat';
import { parseEther, ZeroAddress } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { NATIVE_CRYPTO_ADDRESS } from '../../scripts/lib/contract/native/crypto';

import { Order } from '../../scripts/lib/contract/order/order';
import { calcOrderHash } from '../../scripts/lib/contract/order/orderHash';
import { createOrderSignature } from '../../scripts/lib/contract/order/orderSignature'
import { ASSET_RECEIVE_EVENT_SIGNATURE } from '../../scripts/lib/contract/order/orderReceiverEvents';
import { calcOrderManualReceiveNonce } from '../../scripts/lib/contract/order/orderManualReceive';

import { calcEventHash } from '../../scripts/lib/contract/utils/eventHash';

import { hoursToSeconds, nowSeconds } from '../common/time';
import { gasInfo } from '../common/gas';
import { ANOTHER_CHAIN_ID, OTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { expectLog } from '../common/log';
import { expectRevert } from '../common/revert';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';

const SUFFICIENT_UNLOCK_COUNTER = parseEther('777999');

const EMPTY_POST_DATA = '0x';

describe('OrderReceiverManualNativeTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderReceiverFacet = await ethers.getContractFactory('OrderReceiverFacet');
    const orderReceiverFacet = await OrderReceiverFacet.deploy();

    const OrderReceiverManualNativeFacet = await ethers.getContractFactory('OrderReceiverManualNativeFacet');
    const orderReceiverManualNativeFacet = await OrderReceiverManualNativeFacet.deploy();

    const BitStorageFacet = await ethers.getContractFactory('BitStorageFacet');
    const bitStorageFacet = await BitStorageFacet.deploy();

    const CollateralManagerMock = await ethers.getContractFactory('CollateralManagerMock');
    const collateralManager = await CollateralManagerMock.deploy(await collateralToken.getAddress());

    const Diamond = await ethers.getContractFactory('Diamond');
    const flash = await Diamond.deploy(ownerAccount, diamondCutFacet);

    await (await facet(flash, 'DiamondCutFacet')).diamondCut(
      [
        {
          action: FacetCutAction.Add,
          facetAddress: await orderReceiverFacet.getAddress(),
          functionSelectors: getFunctionSelectors(orderReceiverFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await orderReceiverManualNativeFacet.getAddress(),
          functionSelectors: getFunctionSelectors(orderReceiverManualNativeFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await bitStorageFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitStorageFacet.interface),
        },
      ],
      await orderReceiverFacet.getAddress(),
      orderReceiverFacet.interface.encodeFunctionData('initializeOrderReceiverFacet', [
        await collateralManager.getAddress(),
      ]),
    );

    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData: EMPTY_POST_DATA,
    });

    const order: Order = {
      fromActor: otherAccount.address,
      fromActorReceiver: otherAccount.address,
      fromChain: TEST_CHAIN_ID,
      fromToken: NATIVE_CRYPTO_ADDRESS,
      fromAmount: parseEther('65'),
      toActor: anotherAccount.address,
      toChain: ANOTHER_CHAIN_ID,
      toToken: await otherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
      collateralChain: OTHER_CHAIN_ID,
      collateralAmount: parseEther('21'),
      collateralRewardable: 0n,
      collateralUnlocked: parseEther('25'),
      deadline: await nowSeconds() + hoursToSeconds(1n),
      timeToSend: 0n,
      timeToLiqSend: 0n,
      nonce,
    };
    const orderHash = await calcOrderHash(order);
    const receiveEventHash = await calcEventHash(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash);

    return {
      accounts: {
        owner: ownerAccount,
        other: otherAccount,
        another: anotherAccount,
      },
      collateralManager,
      flash,
      order,
      orderHash,
      receiveEventHash,
    };
  }

  it('Should receive order asset', async function () {
    const {
      accounts,
      flash,
      collateralManager,
      order,
      orderHash,
      receiveEventHash,
    } = await loadFixture(deployFixture);

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    const orderToSignature = await createOrderSignature(order, accounts.another);

    // 25 - 5 = 20 >= 21 (❌)
    await collateralManager.commitLock(accounts.another.address, parseEther('5'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        EMPTY_POST_DATA,
      ),
      { customError: 'ReceiveCallerMismatch()' },
    );

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        EMPTY_POST_DATA,
      ),
      { customError: 'LockRefusal()' },
    );

     // 25 - 4 = 21 >= 21 (✅)
    await collateralManager.cancelLock(accounts.another.address, parseEther('5'), OTHER_CHAIN_ID);
    await collateralManager.commitLock(accounts.another.address, parseEther('4'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(false);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(receiveEventHash);
      expect(has).to.be.equal(false);
    }

    // Zero address error expected: attempt to use native token (as insufficient msg.value fallback) but none setup
    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        EMPTY_POST_DATA,
      ),
      { customError: `AddressEmptyCode("${ZeroAddress}")` },
    );

    const otherBalanceBefore = await ethers.provider.getBalance(accounts.other.address);
    const anotherBalanceBefore = await ethers.provider.getBalance(accounts.another.address);
    const lockedCollateralBefore = await collateralManager.lockCounter(accounts.another.address, OTHER_CHAIN_ID);

    let receiveGasCost: bigint;
    {
      const { tx, receipt } = await gasInfo(
        'call receiveOrderAssetManualNative (first)',
        await (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
          order,
          orderToSignature,
          EMPTY_POST_DATA,
          { value: order.fromAmount },
        ),
      );
      expectLog({
        contract: (await facet(flash, 'OrderReceiverFacet')), tx, receipt, name: 'AssetReceive', check: (data) => {
          expect(data.orderHash).to.be.equal(orderHash);
        },
      });
      receiveGasCost = receipt.gasUsed * receipt.gasPrice;
    }

    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(true);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(receiveEventHash);
      expect(has).to.be.equal(true);
    }

    const otherBalanceAfter = await ethers.provider.getBalance(accounts.other.address);
    const anotherBalanceAfter = await ethers.provider.getBalance(accounts.another.address);
    const lockedCollateralAfter = await collateralManager.lockCounter(accounts.another.address, OTHER_CHAIN_ID);
    expect(otherBalanceAfter).to.be.equal(otherBalanceBefore - parseEther('65') - receiveGasCost);
    expect(anotherBalanceAfter).to.be.equal(anotherBalanceBefore + parseEther('65'));
    expect(lockedCollateralAfter).to.be.equal(lockedCollateralBefore + parseEther('21'));

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        EMPTY_POST_DATA,
        { value: order.fromAmount },
      ),
      { customError: 'OrderAlreadyReceived()' },
    );

    {
      const neighborOrder = {
        ...order,
        fromAmount: parseEther('33'),
        nonce: BigInt(order.nonce) + 1n,
        collateralUnlocked: BigInt(order.collateralUnlocked) + BigInt(order.collateralAmount),
      };
      const neighborOrderToSignature = await createOrderSignature(neighborOrder, accounts.another);

      await gasInfo(
        'call receiveOrderAssetManualNative (neighbor)',
        await (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
          neighborOrder,
          neighborOrderToSignature,
          EMPTY_POST_DATA,
          { value: neighborOrder.fromAmount },
        ),
      );
    }
  });
});
