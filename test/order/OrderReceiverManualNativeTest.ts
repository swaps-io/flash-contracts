import { ethers } from 'hardhat';
import { parseEther, ZeroAddress, ZeroHash } from 'ethers';
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

    const ManualTraderTest = await ethers.getContractFactory('ManualTraderTest');
    const trader = await ManualTraderTest.deploy(flash, anotherAccount);

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
      trader,
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

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        '0x01', // Does not match 'EMPTY_POST_DATA' hash stored in 'nonce'
      ),
      { customError: 'OrderInvalidPostData()' },
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

  it('Should receive order asset with post data', async function () {
    const {
      accounts,
      flash,
      collateralManager,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData(
      'receiveManualNativeHook',
      [
        0n, // No msg.value expected
        originalOrder.fromAmount,
        1337n, // Test counter increment
      ],
    );
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    const orderHash = await calcOrderHash(order);
    const receiveEventHash = await calcEventHash(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash);
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    // 25 - 4 = 21 >= 21 (✅)
    await collateralManager.commitLock(toActor, parseEther('4'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(false);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(receiveEventHash);
      expect(has).to.be.equal(false);
    }
    {
      const count = await trader.counter();
      expect(count).to.be.equal(0n);
    }
    {
      const hash = await trader.lastOrderHash();
      expect(hash).to.be.equal(ZeroHash);
    }

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData + '00', // Does not match post data hash stored in 'nonce'
      ),
      { customError: 'OrderInvalidPostData()' },
    );

    const otherBalanceBefore = await ethers.provider.getBalance(accounts.other.address);
    const traderBalanceBefore = await ethers.provider.getBalance(toActor);
    const lockedCollateralBefore = await collateralManager.lockCounter(toActor, OTHER_CHAIN_ID);

    let receiveGasCost: bigint;
    {
      const { tx, receipt } = await gasInfo(
        'call receiveOrderAssetManualNative (first, post hook)',
        await (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
          order,
          orderToSignature,
          postData,
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
    {
      const count = await trader.counter();
      expect(count).to.be.equal(1337n);
    }
    {
      const hash = await trader.lastOrderHash();
      expect(hash).to.be.equal(orderHash);
    }

    const otherBalanceAfter = await ethers.provider.getBalance(accounts.other.address);
    const traderBalanceAfter = await ethers.provider.getBalance(toActor);
    const lockedCollateralAfter = await collateralManager.lockCounter(toActor, OTHER_CHAIN_ID);
    expect(otherBalanceAfter).to.be.equal(otherBalanceBefore - parseEther('65') - receiveGasCost);
    expect(traderBalanceAfter).to.be.equal(traderBalanceBefore + parseEther('65'));
    expect(lockedCollateralAfter).to.be.equal(lockedCollateralBefore + parseEther('21'));

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData,
        { value: order.fromAmount },
      ),
      { customError: 'OrderAlreadyReceived()' },
    );
  });

  it('Should receive order asset with post data combined with send', async function () {
    const {
      accounts,
      flash,
      collateralManager,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData(
      'receiveManualNativeHook',
      [
        originalOrder.fromAmount,
        originalOrder.fromAmount,
        1337n, // Test counter increment
      ],
    );
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
      shouldPostWithSend: true,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    const orderHash = await calcOrderHash(order);
    const receiveEventHash = await calcEventHash(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash);
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    // 25 - 4 = 21 >= 21 (✅)
    await collateralManager.commitLock(toActor, parseEther('4'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(false);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(receiveEventHash);
      expect(has).to.be.equal(false);
    }
    {
      const count = await trader.counter();
      expect(count).to.be.equal(0n);
    }
    {
      const hash = await trader.lastOrderHash();
      expect(hash).to.be.equal(ZeroHash);
    }

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData + '00', // Does not match post data hash stored in 'nonce'
      ),
      { customError: 'OrderInvalidPostData()' },
    );

    const otherBalanceBefore = await ethers.provider.getBalance(accounts.other.address);
    const traderBalanceBefore = await ethers.provider.getBalance(toActor);
    const lockedCollateralBefore = await collateralManager.lockCounter(toActor, OTHER_CHAIN_ID);

    let receiveGasCost: bigint;
    {
      const { tx, receipt } = await gasInfo(
        'call receiveOrderAssetManualNative (first, post hook, send combined)',
        await (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
          order,
          orderToSignature,
          postData,
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
    {
      const count = await trader.counter();
      expect(count).to.be.equal(1337n);
    }
    {
      const hash = await trader.lastOrderHash();
      expect(hash).to.be.equal(orderHash);
    }

    const otherBalanceAfter = await ethers.provider.getBalance(accounts.other.address);
    const traderBalanceAfter = await ethers.provider.getBalance(toActor);
    const lockedCollateralAfter = await collateralManager.lockCounter(toActor, OTHER_CHAIN_ID);
    expect(otherBalanceAfter).to.be.equal(otherBalanceBefore - parseEther('65') - receiveGasCost);
    expect(traderBalanceAfter).to.be.equal(traderBalanceBefore + parseEther('65'));
    expect(lockedCollateralAfter).to.be.equal(lockedCollateralBefore + parseEther('21'));

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData,
        { value: order.fromAmount },
      ),
      { customError: 'OrderAlreadyReceived()' },
    );
  });

  it('Should report core hook gas', async function () {
    const {
      accounts,
      flash,
      collateralManager,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData('coreHook');
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    // 25 - 4 = 21 >= 21 (✅)
    await collateralManager.commitLock(toActor, parseEther('4'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    await gasInfo(
      'call receiveOrderAssetManualNative (first, post core hook)',
      await (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData,
        { value: order.fromAmount },
      ),
    );
  });

  it('Should report core combined hook gas', async function () {
    const {
      accounts,
      flash,
      collateralManager,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData('coreHookPayable');
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
      shouldPostWithSend: true,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    // 25 - 4 = 21 >= 21 (✅)
    await collateralManager.commitLock(toActor, parseEther('4'), OTHER_CHAIN_ID, SUFFICIENT_UNLOCK_COUNTER);

    await gasInfo(
      'call receiveOrderAssetManualNative (first, post core hook, send combined)',
      await (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData,
        { value: order.fromAmount },
      ),
    );
  });

  it('Should revert if post hook failure not allowed', async function () {
    const {
      accounts,
      flash,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData(
      'receiveManualNativeHook',
      [
        0n, // No msg.value expected
        0n, // Trigger unexpected balance revert
        1337n, // Test counter increment
      ],
    );
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData,
        { value: order.fromAmount },
      ),
      { customError: `BalanceUnexpected(${order.fromAmount}, 0)` },
    );
  });

  it('Should not revert if post hook failure is allowed', async function () {
    const {
      accounts,
      flash,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData(
      'receiveManualNativeHook',
      [
        0n, // No msg.value expected
        0n, // Trigger unexpected balance revert
        1337n, // Test counter increment
      ],
    );
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
      shouldPostAllowFail: true,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
      order,
      orderToSignature,
      postData,
      { value: order.fromAmount },
    );
  });

  it('Should revert if post hook combined with send', async function () {
    const {
      accounts,
      flash,
      order: originalOrder,
      trader,
    } = await loadFixture(deployFixture);

    // Create order with trader "to" actor & post hook call
    const postData = trader.interface.encodeFunctionData(
      'receiveManualNativeHook',
      [
        originalOrder.fromAmount,
        0n, // Trigger unexpected balance revert
        1337n, // Test counter increment
      ],
    );
    const nonce = await calcOrderManualReceiveNonce({
      nonce: 13377331n,
      postData,
      shouldPostWithSend: true,
    });
    const toActor = await trader.getAddress();
    const order = {
      ...originalOrder,
      toActor,
      nonce,
    };
    //

    await accounts.owner.sendTransaction({
      to: accounts.other.address,
      value: parseEther('123'),
    });

    // "Another" is signer for trader contract
    const orderToSignature = await createOrderSignature(order, accounts.another);

    await expectRevert(
      (await facet(flash, 'OrderReceiverManualNativeFacet')).connect(accounts.other).receiveOrderAssetManualNative(
        order,
        orderToSignature,
        postData,
        { value: order.fromAmount },
      ),
      { customError: `BalanceUnexpected(${order.fromAmount}, 0)` },
    );
  });
});
