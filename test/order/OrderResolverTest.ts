import { ethers } from 'hardhat';
import { parseEther } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { Order } from '../../scripts/lib/contract/order/order';
import { calcOrderHash } from '../../scripts/lib/contract/order/orderHash';
import { calcOrderActorHash } from '../../scripts/lib/contract/order/orderActorHash';
import { ASSET_RECEIVE_EVENT_SIGNATURE } from '../../scripts/lib/contract/order/orderReceiverEvents';
import {
  ASSET_LIQ_SEND_EVENT_SIGNATURE,
  ASSET_NO_SEND_EVENT_SIGNATURE,
  ASSET_SEND_EVENT_SIGNATURE,
} from '../../scripts/lib/contract/order/orderSenderEvents';

import { minutesToSeconds, nowSeconds } from '../common/time';
import { gasInfo } from '../common/gas';
import { ANOTHER_CHAIN_ID, OTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { expectLog } from '../common/log';
import { expectRevert } from '../common/revert';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';
import { mockHashEventProof } from '../common/proofMock';

describe('OrderResolverTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();
    const anotherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderResolverFacet = await ethers.getContractFactory('OrderResolverFacet');
    const orderResolverFacet = await OrderResolverFacet.deploy();

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
          facetAddress: await orderResolverFacet.getAddress(),
          functionSelectors: getFunctionSelectors(orderResolverFacet.interface),
        },
      ],
      await orderResolverFacet.getAddress(),
      orderResolverFacet.interface.encodeFunctionData('initializeOrderResolverFacet', [
        await collateralManager.getAddress(),
        await proofVerifier.getAddress(),
      ]),
    );

    const order: Order = {
      fromActor: otherAccount.address,
      fromActorReceiver: otherAccount.address,
      fromChain: OTHER_CHAIN_ID,
      fromToken: await otherToken.getAddress(),
      fromAmount: parseEther('65'),
      toActor: anotherAccount.address,
      toChain: ANOTHER_CHAIN_ID,
      toToken: await anotherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
      collateralChain: TEST_CHAIN_ID,
      collateralAmount: parseEther('21'),
      collateralRewardable: 0n,
      collateralUnlocked: parseEther('100'),
      deadline: await nowSeconds() + minutesToSeconds(25n),
      timeToSend: 0n,
      timeToLiqSend: minutesToSeconds(35n),
      nonce: 13377331n,
    };
    const orderHash = await calcOrderHash(order);

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

  it('Should confirm order', async function () {
    const { accounts, tokens, flash, collateralManager, order, orderHash } = await loadFixture(deployFixture);

    await tokens.collateral.mint(accounts.another.address, parseEther('142'));
    await tokens.collateral.connect(accounts.another).approve(collateralManager, parseEther('142'));
    await collateralManager.connect(accounts.another).deposit(accounts.another.address, parseEther('142'), OTHER_CHAIN_ID);

    const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash, order.fromChain);
    const sendProof = await mockHashEventProof(ASSET_SEND_EVENT_SIGNATURE, orderHash, order.toChain);

    {
      const resolved = await (await facet(flash, 'OrderResolverFacet')).orderResolved(orderHash);
      expect(resolved).to.be.equal(false);
    }

    const unlockedBefore = await collateralManager.unlockCounter(accounts.another.address, OTHER_CHAIN_ID);

    {
      const { tx, receipt } = await gasInfo(
        'call confirmOrderAssetSend',
        await (await facet(flash, 'OrderResolverFacet')).connect(accounts.another).confirmOrderAssetSend(order, receiveProof, sendProof),
      );
      expectLog({
        contract: (await facet(flash, 'OrderResolverFacet')), tx, receipt, name: 'OrderSendConfirm', check: (data) => {
          expect(data.orderHash).to.be.equal(orderHash);
        }
      });
    }

    {
      const resolved = await (await facet(flash, 'OrderResolverFacet')).orderResolved(orderHash);
      expect(resolved).to.be.equal(true);
    }

    const unlockedAfter = await collateralManager.unlockCounter(accounts.another.address, OTHER_CHAIN_ID);
    expect(unlockedAfter).to.be.equal(unlockedBefore + parseEther('21'));

    await expectRevert(
      (await facet(flash, 'OrderResolverFacet')).connect(accounts.another).confirmOrderAssetSend(order, receiveProof, sendProof),
      { customError: 'OrderAlreadyResolved()' },
    );
  });

  it('Should slash order', async function () {
    const { accounts, tokens, flash, collateralManager, order, orderHash } = await loadFixture(deployFixture);

    await tokens.collateral.mint(accounts.another.address, parseEther('142'));
    await tokens.collateral.connect(accounts.another).approve(collateralManager, parseEther('142'));
    await collateralManager.connect(accounts.another).deposit(accounts.another.address, parseEther('142'), OTHER_CHAIN_ID);

    const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash, order.fromChain);

    {
      const resolved = await (await facet(flash, 'OrderResolverFacet')).orderResolved(orderHash);
      expect(resolved).to.be.equal(false);
    }

    const unlockedBefore = await collateralManager.unlockCounter(accounts.another.address, OTHER_CHAIN_ID);
    const balanceBefore = await tokens.collateral.balanceOf(accounts.other.address);

    const orderActorHash = await calcOrderActorHash(orderHash, accounts.owner.address);
    const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, orderActorHash, order.toChain);

    await expectRevert(
      (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(order, accounts.another.address, receiveProof, noSendProof),
      { customError: 'UnexpectedHash(.*)' }, // Wrong 'reporter' - 'owner' expected, 'another' provided
    );

    {
      const { tx, receipt } = await gasInfo(
        'call slashOrderCollateral',
        await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(order, accounts.owner.address, receiveProof, noSendProof),
      );
      expectLog({
        contract: (await facet(flash, 'OrderResolverFacet')), tx, receipt, name: 'OrderCollateralSlash', check: (data) => {
          expect(data.orderHash).to.be.equal(orderHash);
        }
      });
    }

    {
      const resolved = await (await facet(flash, 'OrderResolverFacet')).orderResolved(orderHash);
      expect(resolved).to.be.equal(true);
    }

    const unlockedAfter = await collateralManager.unlockCounter(accounts.another.address, OTHER_CHAIN_ID);
    const balanceAfter = await tokens.collateral.balanceOf(accounts.other.address);
    expect(unlockedAfter).to.be.equal(unlockedBefore);
    expect(balanceAfter).to.be.equal(balanceBefore + parseEther('21'));
  });

  it('Should slash liquidated order', async function () {
    const { accounts, tokens, flash, collateralManager, order, orderHash } = await loadFixture(deployFixture);

    await tokens.collateral.mint(accounts.another.address, parseEther('142'));
    await tokens.collateral.connect(accounts.another).approve(collateralManager, parseEther('142'));
    await collateralManager.connect(accounts.another).deposit(accounts.another.address, parseEther('142'), OTHER_CHAIN_ID);

    const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, orderHash, order.fromChain);
    const liqSendProofOwner = await mockHashEventProof(ASSET_LIQ_SEND_EVENT_SIGNATURE, await calcOrderActorHash(orderHash, accounts.owner.address), order.toChain);
    const liqSendProofAnother = await mockHashEventProof(ASSET_LIQ_SEND_EVENT_SIGNATURE, await calcOrderActorHash(orderHash, accounts.another.address), order.toChain);

    {
      const resolved = await (await facet(flash, 'OrderResolverFacet')).orderResolved(orderHash);
      expect(resolved).to.be.equal(false);
    }

    const unlockedBefore = await collateralManager.unlockCounter(accounts.another.address, OTHER_CHAIN_ID);
    const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
    const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

    await expectRevert(
      (await facet(flash, 'OrderResolverFacet')).slashOrderLiqCollateral(order, accounts.owner.address, receiveProof, liqSendProofAnother),
      { customError: 'UnexpectedHash(.*)' },
    );

    {
      const { tx, receipt } = await gasInfo(
        'call slashOrderLiqCollateral',
        await (await facet(flash, 'OrderResolverFacet')).slashOrderLiqCollateral(order, accounts.owner.address, receiveProof, liqSendProofOwner),
      );
      expectLog({
        contract: (await facet(flash, 'OrderResolverFacet')), tx, receipt, name: 'OrderCollateralSlash', check: (data) => {
          expect(data.orderHash).to.be.equal(orderHash);
        }
      });
    }

    {
      const resolved = await (await facet(flash, 'OrderResolverFacet')).orderResolved(orderHash);
      expect(resolved).to.be.equal(true);
    }

    const unlockedAfter = await collateralManager.unlockCounter(accounts.another.address, OTHER_CHAIN_ID);
    const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
    const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
    expect(unlockedAfter).to.be.equal(unlockedBefore);
    expect(balanceOtherAfter).to.be.equal(balanceOtherBefore);
    expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore + parseEther('21'));
  });

  it('Should send reward to slashed collateral reporter', async () => {
    const { accounts, tokens, flash, collateralManager, order } = await loadFixture(deployFixture);

    await tokens.collateral.mint(accounts.another.address, parseEther('1421'));
    await tokens.collateral.connect(accounts.another).approve(collateralManager, parseEther('1421'));
    await collateralManager.connect(accounts.another).deposit(accounts.another.address, parseEther('1421'), OTHER_CHAIN_ID);

    // Test 'collateralRewardable = 0' + 'reporter != from actor'
    // is already done by 'Should slash order' above

    // Test 'collateralRewardable < collateralAmount' + 'reporter != from actor'
    {
      const rewardableOrder = {
        ...order,
        collateralRewardable: parseEther('4'),
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, accounts.owner.address);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.owner.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore + parseEther('17'));
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore + parseEther('4'));
    }

    // Test 'collateralRewardable = collateralAmount' + 'reporter != from actor'
    {
      const rewardableOrder = {
        ...order,
        collateralRewardable: parseEther('21'),
        nonce: order.nonce + 1n,
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, accounts.owner.address);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.owner.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore);
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore + parseEther('21'));
    }

    // Test 'collateralRewardable > collateralAmount' + 'reporter != from actor'
    {
      const rewardableOrder = {
        ...order,
        collateralRewardable: parseEther('25'),
        nonce: order.nonce + 2n,
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, accounts.owner.address);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.owner.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore);
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore + parseEther('21'));
    }

    // Test 'collateralRewardable = 0' + 'reporter == from actor'
    {
      const rewardableOrder = {
        ...order,
        nonce: order.nonce + 3n,
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, rewardableOrder.fromActor);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.other.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore + parseEther('21'));
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore);
    }

    // Test 'collateralRewardable < collateralAmount' + 'reporter == from actor'
    {
      const rewardableOrder = {
        ...order,
        collateralRewardable: parseEther('4'),
        nonce: order.nonce + 4n,
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, rewardableOrder.fromActor);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.other.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore + parseEther('21'));
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore);
    }

    // Test 'collateralRewardable = collateralAmount' + 'reporter == from actor'
    {
      const rewardableOrder = {
        ...order,
        collateralRewardable: parseEther('21'),
        nonce: order.nonce + 5n,
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, rewardableOrder.fromActor);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.other.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore + parseEther('21'));
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore);
    }

    // Test 'collateralRewardable = collateralAmount' + 'reporter == from actor'
    {
      const rewardableOrder = {
        ...order,
        collateralRewardable: parseEther('25'),
        nonce: order.nonce + 6n,
      };
      const rewardableOrderHash = await calcOrderHash(rewardableOrder);
      const rewardableOrderActorHash = await calcOrderActorHash(rewardableOrderHash, rewardableOrder.fromActor);

      const receiveProof = await mockHashEventProof(ASSET_RECEIVE_EVENT_SIGNATURE, rewardableOrderHash, rewardableOrder.fromChain);
      const noSendProof = await mockHashEventProof(ASSET_NO_SEND_EVENT_SIGNATURE, rewardableOrderActorHash, rewardableOrder.toChain);

      const balanceContractBefore = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherBefore = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerBefore = await tokens.collateral.balanceOf(accounts.owner.address);

      await (await facet(flash, 'OrderResolverFacet')).slashOrderCollateral(rewardableOrder, accounts.other.address, receiveProof, noSendProof);

      const balanceContractAfter = await tokens.collateral.balanceOf(collateralManager);
      const balanceOtherAfter = await tokens.collateral.balanceOf(accounts.other.address);
      const balanceOwnerAfter = await tokens.collateral.balanceOf(accounts.owner.address);
      expect(balanceContractAfter).to.be.equal(balanceContractBefore - parseEther('21'));
      expect(balanceOtherAfter).to.be.equal(balanceOtherBefore + parseEther('21'));
      expect(balanceOwnerAfter).to.be.equal(balanceOwnerBefore);
    }
  });
});
