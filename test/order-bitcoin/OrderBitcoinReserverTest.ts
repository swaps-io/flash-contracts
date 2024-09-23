import { ethers } from 'hardhat';
import { parseEther, ZeroHash } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { NATIVE_CRYPTO_ADDRESS } from '../../scripts/lib/contract/order/nativeCrypto';
import { calcOrderActorHash } from '../../scripts/lib/contract/order/orderActorHash';

import { OrderBitcoin } from '../../scripts/lib/contract/order-bitcoin/orderBitcoin';
import { calcOrderBitcoinHash } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinHash';
import { createOrderBitcoinSignature } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinSignature';
import { BitcoinCollateralState } from '../../scripts/lib/contract/order-bitcoin/bitcoinCollateralState';
import { ASSET_NO_RECEIVE_EVENT_SIGNATURE } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinReserverEvents';
import { ANY_BITCOIN_ADDRESS } from '../../scripts/lib/contract/order-bitcoin/anyBitcoinAddress';

import { ANOTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { hoursToSeconds, nowSeconds } from '../common/time';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';
import { expectRevert } from '../common/revert';
import { BITCOIN_TEST_CHAIN_ID, parseBitcoin } from '../common/bitcoin';
import { mockHashEventProof } from '../common/proofMock';

describe('OrderBitcoinReserverTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();
    const anotherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderBitcoinReserverFacet = await ethers.getContractFactory('OrderBitcoinReserverFacet');
    const reserverFacet = await OrderBitcoinReserverFacet.deploy();

    const BitStorageFacet = await ethers.getContractFactory('BitStorageFacet');
    const bitStorageFacet = await BitStorageFacet.deploy();

    const CollateralManagerMock = await ethers.getContractFactory('CollateralManagerMock');
    const collateralManager = await CollateralManagerMock.deploy(await collateralToken.getAddress());

    const ProofVerifierMock = await ethers.getContractFactory('ProofVerifierMock');
    const proofVerifier = await ProofVerifierMock.deploy();

    const Diamond = await ethers.getContractFactory('Diamond');
    const flash = await Diamond.deploy(ownerAccount, diamondCutFacet);

    await (await facet(flash, 'DiamondCutFacet')).diamondCut(
      [
        {
          action: FacetCutAction.Add,
          facetAddress: await reserverFacet.getAddress(),
          functionSelectors: getFunctionSelectors(reserverFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await bitStorageFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitStorageFacet.interface),
        },
      ],
      await reserverFacet.getAddress(),
      reserverFacet.interface.encodeFunctionData('initializeOrderBitcoinReserverFacet', [
        await collateralManager.getAddress(),
        await proofVerifier.getAddress(),
      ]),
    );

    // Order from Bitcoin to EVM (from user perspective)
    const order: OrderBitcoin = {
      fromActor: otherAccount.address,
      fromActorReceiver: otherAccount.address,
      fromActorBitcoin: '3P4Nz2rw7F6twVC1aEFC32LnG4HTZ3RLJs',
      fromChain: BITCOIN_TEST_CHAIN_ID,
      fromToken: NATIVE_CRYPTO_ADDRESS,
      fromAmount: parseBitcoin('65'),
      toActor: anotherAccount.address,
      toActorBitcoin: 'bc1pnuwsv2sxrq67cc2exrljh9md8mu6haykj6d6qadmhry7nl82q02qucyc04',
      toChain: ANOTHER_CHAIN_ID,
      toToken: await anotherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
      collateralChain: TEST_CHAIN_ID,
      collateralAmount: parseBitcoin('21'),
      collateralRewardable: 0n,
      collateralUnlocked: parseBitcoin('25'),
      deadline: await nowSeconds() + hoursToSeconds(2n),
      createdAtBitcoin: await nowSeconds(),
      timeToReceiveBitcoin: hoursToSeconds(1n),
      timeToSubmitBitcoin: hoursToSeconds(1n),
      timeToSend: 0n,
      timeToLiqSend: 0n,
      nonce: 13377331n,
    };
    const orderHash = await calcOrderBitcoinHash(order);

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
    };
  }

  it('Should not allow Bitcoin reserver lock by non to-actor', async function () {
    const { accounts, flash, collateralManager, order, orderHash } = await loadFixture(deployFixture);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Pending);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(0n);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(ZeroHash);
    }

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await expectRevert(
      (await facet(flash, 'OrderBitcoinReserverFacet'))
        .lockOrderBitcoinCollateral(order, orderFromSignature),
      { customError: 'BitcoinLockerMismatch()' },
    );
  });

  it('Should allow Bitcoin reserver lock by to-actor', async function () {
    const { accounts, flash, collateralManager, order, orderHash } = await loadFixture(deployFixture);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Pending);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(0n);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(ZeroHash);
    }

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .lockOrderBitcoinCollateral(order, orderFromSignature);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Locked);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(order.collateralAmount);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(ZeroHash);
    }
  });

  it('Should allow Bitcoin reserver lock by to-actor with any from-actor address', async function () {
    const { accounts, flash, collateralManager, order: originalOrder } = await loadFixture(deployFixture);

    const order: OrderBitcoin = {
      ...originalOrder,
      fromActorBitcoin: ANY_BITCOIN_ADDRESS,
    };
    const orderHash = await calcOrderBitcoinHash(order);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Pending);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(0n);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(ZeroHash);
    }

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .lockOrderBitcoinCollateral(order, orderFromSignature);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Locked);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(order.collateralAmount);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(orderHash);
    }
  });

  it('Should allow Bitcoin reserver unlock by to-actor', async function () {
    const { accounts, flash, collateralManager, order, orderHash } = await loadFixture(deployFixture);

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .lockOrderBitcoinCollateral(order, orderFromSignature);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Locked);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(order.collateralAmount);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(ZeroHash);
    }

    const noReceiveHash = await calcOrderActorHash(orderHash, order.toActor);
    const noReceiveProof = await mockHashEventProof(ASSET_NO_RECEIVE_EVENT_SIGNATURE, noReceiveHash, BITCOIN_TEST_CHAIN_ID);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .unlockOrderBitcoinCollateral(order, noReceiveProof);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Unlocked);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(0n);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(ZeroHash);
    }
  });

  it('Should allow Bitcoin reserver unlock by to-actor with any from-actor address', async function () {
    const { accounts, flash, collateralManager, order: originalOrder } = await loadFixture(deployFixture);

    const order: OrderBitcoin = {
      ...originalOrder,
      fromActorBitcoin: ANY_BITCOIN_ADDRESS,
    };
    const orderHash = await calcOrderBitcoinHash(order);

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .lockOrderBitcoinCollateral(order, orderFromSignature);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Locked);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(order.collateralAmount);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(orderHash);
    }

    const noReceiveHash = await calcOrderActorHash(orderHash, order.toActor);
    const noReceiveProof = await mockHashEventProof(ASSET_NO_RECEIVE_EVENT_SIGNATURE, noReceiveHash, BITCOIN_TEST_CHAIN_ID);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .unlockOrderBitcoinCollateral(order, noReceiveProof);

    {
      const state = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .orderBitcoinCollateralState(orderHash);
      expect(state).to.be.equal(BitcoinCollateralState.Unlocked);
    }
    {
      const lockCounter = await collateralManager.lockCounter(order.toActor, order.collateralChain);
      expect(lockCounter).to.be.equal(0n);
    }
    {
      const usedOrderHash = await (await facet(flash, 'OrderBitcoinReserverFacet'))
        .bitcoinAddressUsedOrder(order.toActorBitcoin);
      expect(usedOrderHash).to.be.equal(orderHash);
    }
  });

  it('Should not allow Bitcoin reserver lock second time', async function () {
    const { accounts, flash, order } = await loadFixture(deployFixture);

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .lockOrderBitcoinCollateral(order, orderFromSignature);

    await expectRevert(
      (await facet(flash, 'OrderBitcoinReserverFacet'))
        .connect(accounts.another)
        .lockOrderBitcoinCollateral(order, orderFromSignature),
      { customError: 'BitcoinLockRefusal()' },
    );
  });

  it('Should not allow Bitcoin reserver lock after unlock', async function () {
    const { accounts, flash, order, orderHash } = await loadFixture(deployFixture);

    const orderFromSignature = await createOrderBitcoinSignature(order, accounts.other);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .lockOrderBitcoinCollateral(order, orderFromSignature);

    const noReceiveHash = await calcOrderActorHash(orderHash, order.toActor);
    const noReceiveProof = await mockHashEventProof(ASSET_NO_RECEIVE_EVENT_SIGNATURE, noReceiveHash, BITCOIN_TEST_CHAIN_ID);

    await (await facet(flash, 'OrderBitcoinReserverFacet'))
      .connect(accounts.another)
      .unlockOrderBitcoinCollateral(order, noReceiveProof);

    await expectRevert(
      (await facet(flash, 'OrderBitcoinReserverFacet'))
        .connect(accounts.another)
        .lockOrderBitcoinCollateral(order, orderFromSignature),
      { customError: 'BitcoinLockRefusal()' },
    );
  });
});
