import { ethers } from 'hardhat';
import { parseEther } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { Order } from '../../scripts/lib/contract/order/order';
import { calcOrderHash } from '../../scripts/lib/contract/order/orderHash';
import { createOrderSignature } from '../../scripts/lib/contract/order/orderSignature'
import { ASSET_RECEIVE_EVENT_SIGNATURE } from '../../scripts/lib/contract/order/orderReceiverEvents';

import { calcEventHash } from '../../scripts/lib/contract/utils/eventHash';

import { hoursToSeconds, nowSeconds } from '../common/time';
import { gasInfo } from '../common/gas';
import { ANOTHER_CHAIN_ID, OTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { expectLog } from '../common/log';
import { expectRevert } from '../common/revert';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';

const SUFFICIENT_UNLOCK_COUNTER = parseEther('777999');

describe('OrderReceiverTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();
    const anotherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderReceiverFacet = await ethers.getContractFactory('OrderReceiverFacet');
    const orderReceiverFacet = await OrderReceiverFacet.deploy();

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
          facetAddress: await bitStorageFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitStorageFacet.interface),
        },
      ],
      await orderReceiverFacet.getAddress(),
      orderReceiverFacet.interface.encodeFunctionData('initializeOrderReceiverFacet', [
        await collateralManager.getAddress(),
      ]),
    );

    const order: Order = {
      fromActor: otherAccount.address,
      fromActorReceiver: otherAccount.address,
      fromChain: TEST_CHAIN_ID,
      fromToken: await otherToken.getAddress(),
      fromAmount: parseEther('65'),
      toActor: anotherAccount.address,
      toChain: ANOTHER_CHAIN_ID,
      toToken: await anotherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
      collateralChain: OTHER_CHAIN_ID,
      collateralAmount: parseEther('21'),
      collateralRewardable: 0n,
      collateralUnlocked: parseEther('25'),
      deadline: await nowSeconds() + hoursToSeconds(1n),
      timeToSend: 0n,
      timeToLiqSend: 0n,
      nonce: 13377331n,
    };
    const orderHash = await calcOrderHash(order);
    const receiveEventHash = await calcEventHash(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash);

    return {
      accounts: {
        owner: ownerAccount,
        other: otherAccount,
        another: anotherAccount,
      },
      tokens: {
        collateral: collateralToken,
        other: otherToken,
        another: anotherToken,
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
      tokens,
      flash,
      collateralManager,
      order,
      orderHash,
      receiveEventHash,
    } = await loadFixture(deployFixture);

    await tokens.other.mint(accounts.other.address, parseEther('123'));
    await tokens.other.connect(accounts.other).approve(flash, parseEther('65'));

    const orderFromSignature = await createOrderSignature(order, accounts.other);

    // 25 - 5 = 20 >= 21 (❌)
    await collateralManager.commitLock(accounts.another.address, parseEther('5'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    await expectRevert(
      (await facet(flash, 'OrderReceiverFacet')).receiveOrderAsset(
        order,
        orderFromSignature,
      ),
      { customError: 'ReceiveCallerMismatch()' },
    );

    await expectRevert(
      (await facet(flash, 'OrderReceiverFacet')).connect(accounts.another).receiveOrderAsset(
        order,
        orderFromSignature,
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

    const otherBalanceBefore = await tokens.other.balanceOf(accounts.other.address);
    const anotherBalanceBefore = await tokens.other.balanceOf(accounts.another.address);
    const lockedCollateralBefore = await collateralManager.lockCounter(accounts.another.address, OTHER_CHAIN_ID);

    {
      const { tx, receipt } = await gasInfo(
        'call receiveOrderAsset (first)',
        await (await facet(flash, 'OrderReceiverFacet')).connect(accounts.another).receiveOrderAsset(
          order,
          orderFromSignature,
        ),
      );
      expectLog({
        contract: (await facet(flash, 'OrderReceiverFacet')), tx, receipt, name: 'AssetReceive', check: (data) => {
          expect(data.orderHash).to.be.equal(orderHash);
        },
      });
    }

    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(true);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(receiveEventHash);
      expect(has).to.be.equal(true);
    }

    const otherBalanceAfter = await tokens.other.balanceOf(accounts.other.address);
    const anotherBalanceAfter = await tokens.other.balanceOf(accounts.another.address);
    const lockedCollateralAfter = await collateralManager.lockCounter(accounts.another.address, OTHER_CHAIN_ID);
    expect(otherBalanceAfter).to.be.equal(otherBalanceBefore - parseEther('65'));
    expect(anotherBalanceAfter).to.be.equal(anotherBalanceBefore + parseEther('65'));
    expect(lockedCollateralAfter).to.be.equal(lockedCollateralBefore + parseEther('21'));

    await expectRevert(
      (await facet(flash, 'OrderReceiverFacet')).connect(accounts.another).receiveOrderAsset(
        order,
        orderFromSignature,
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
      const neighborOrderFromSignature = await createOrderSignature(neighborOrder, accounts.other);

      await tokens.other.connect(accounts.other).approve(flash, parseEther('33'));

      await gasInfo(
        'call receiveOrderAsset (neighbor)',
        await (await facet(flash, 'OrderReceiverFacet')).connect(accounts.another).receiveOrderAsset(
          neighborOrder,
          neighborOrderFromSignature,
        ),
      );
    }
  });
});
