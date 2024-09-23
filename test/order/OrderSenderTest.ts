import { ethers } from 'hardhat';
import { parseEther, ZeroAddress } from 'ethers';
import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { Order } from '../../scripts/lib/contract/order/order';
import { calcOrderHash } from '../../scripts/lib/contract/order/orderHash';
import { calcOrderActorHash } from '../../scripts/lib/contract/order/orderActorHash';
import {
  ASSET_LIQ_SEND_EVENT_SIGNATURE,
  ASSET_NO_SEND_EVENT_SIGNATURE,
  ASSET_SEND_EVENT_SIGNATURE,
} from '../../scripts/lib/contract/order/orderSenderEvents';

import { calcEventHash } from '../../scripts/lib/contract/utils/eventHash';

import { minutesToSeconds, nowSeconds } from '../common/time';
import { gasInfo } from '../common/gas';
import { ANOTHER_CHAIN_ID, OTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { expectLog } from '../common/log';
import { expectRevert } from '../common/revert';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';

describe('OrderSenderTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();
    const anotherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderSenderFacet = await ethers.getContractFactory('OrderSenderFacet');
    const orderSenderFacet = await OrderSenderFacet.deploy();

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
          facetAddress: await orderSenderFacet.getAddress(),
          functionSelectors: getFunctionSelectors(orderSenderFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await bitStorageFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitStorageFacet.interface),
        },
      ],
      ZeroAddress,
      '0x',
    );

    const order: Order = {
      fromActor: otherAccount.address,
      fromActorReceiver: otherAccount.address,
      fromChain: OTHER_CHAIN_ID,
      fromToken: await otherToken.getAddress(),
      fromAmount: parseEther('65'),
      toActor: anotherAccount.address,
      toChain: TEST_CHAIN_ID,
      toToken: await anotherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
      collateralChain: ANOTHER_CHAIN_ID,
      collateralAmount: parseEther('21'),
      collateralRewardable: 0n,
      collateralUnlocked: parseEther('100'),
      deadline: await nowSeconds() + minutesToSeconds(10n),
      timeToSend: minutesToSeconds(15n),
      timeToLiqSend: minutesToSeconds(20n),
      nonce: 13377331n,
    };
    const orderHash = await calcOrderHash(order);
    const sendEventHash = await calcEventHash(ASSET_SEND_EVENT_SIGNATURE, orderHash);

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
      sendEventHash,
    };
  }

  it('Should send order asset', async function () {
    const {
      accounts,
      tokens,
      flash,
      order,
      orderHash,
      sendEventHash,
    } = await loadFixture(deployFixture);

    await tokens.another.mint(accounts.another.address, parseEther('123'));
    await tokens.another.connect(accounts.another).approve(flash, parseEther('43'));

    await expectRevert(
      (await facet(flash, 'OrderSenderFacet')).sendOrderAsset(order),
      { customError: 'SendCallerMismatch()' },
    );

    {
      const sent = await (await facet(flash, 'OrderSenderFacet')).orderAssetSent(orderHash);
      expect(sent).to.be.equal(false);
      const liquidator = await (await facet(flash, 'OrderSenderFacet')).orderLiquidator(orderHash);
      expect(liquidator).to.be.equal(ZeroAddress);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(sendEventHash);
      expect(has).to.be.equal(false);
    }

    const anotherBalanceBefore = await tokens.another.balanceOf(accounts.another.address);
    const otherBalanceBefore = await tokens.another.balanceOf(accounts.other.address);

    // Should be possible for to actor to send in period between receive deadline (in ~10m)
    // and send deadline (we skip 3m of 15m): 10 + 3 = 13m, 52 * 15s = 13m passed
    await mine(52, { interval: 15 });

    {
      const { tx, receipt } = await gasInfo(
        'call sendOrderAsset (first)',
        await (await facet(flash, 'OrderSenderFacet')).connect(accounts.another).sendOrderAsset(order),
      );
      expectLog({
        contract: (await facet(flash, 'OrderSenderFacet')), tx, receipt, name: 'AssetSend', check: (data) => {
          expect(data.orderHash).to.be.equal(orderHash);
        },
      });
    }

    const anotherBalanceAfter = await tokens.another.balanceOf(accounts.another.address);
    const otherBalanceAfter = await tokens.another.balanceOf(accounts.other.address);
    expect(anotherBalanceAfter).to.be.equal(anotherBalanceBefore - parseEther('43'));
    expect(otherBalanceAfter).to.be.equal(otherBalanceBefore + parseEther('43'));

    {
      const sent = await (await facet(flash, 'OrderSenderFacet')).orderAssetSent(orderHash);
      expect(sent).to.be.equal(true);
      const liquidator = await (await facet(flash, 'OrderSenderFacet')).orderLiquidator(orderHash);
      expect(liquidator).to.be.equal(ZeroAddress);
    }
    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(sendEventHash);
      expect(has).to.be.equal(true);
    }

    {
      const neighborOrder = {
        ...order,
        toAmount: parseEther('69'),
        nonce: BigInt(order.nonce) + 1n,
      };

      await tokens.another.connect(accounts.another).approve(flash, parseEther('69'));

      await gasInfo(
        'call sendOrderAsset (neighbor)',
        await (await facet(flash, 'OrderSenderFacet')).connect(accounts.another).sendOrderAsset(neighborOrder),
      );
    }
  });

  it('Should liquidate send order asset', async function () {
    const { accounts, tokens, flash, order, orderHash } = await loadFixture(deployFixture);

    await tokens.another.mint(accounts.owner.address, parseEther('123'));
    await tokens.another.approve(flash, parseEther('43'));

    await expectRevert(
      (await facet(flash, 'OrderSenderFacet')).sendOrderAsset(order),
      { customError: 'SendCallerMismatch()' },
    );

    await expectRevert(
      (await facet(flash, 'OrderSenderFacet')).sendOrderLiqAsset(order),
      { customError: 'OrderLiqSendUnreached()' },
    );

    // Deadline for to actor is ~ in 10 + 15 = 25m, 102 * 15s = 25m 30s passed
    await mine(102, { interval: 15 });

    await expectRevert(
      (await facet(flash, 'OrderSenderFacet')).connect(accounts.another).sendOrderAsset(order),
      { customError: 'OrderSendExpired()' },
    );

    const ownerBalanceBefore = await tokens.another.balanceOf(accounts.owner.address);
    const anotherBalanceBefore = await tokens.another.balanceOf(accounts.another.address);
    const otherBalanceBefore = await tokens.another.balanceOf(accounts.other.address);

    const orderActorHash = await calcOrderActorHash(orderHash, accounts.owner.address);
    const liqSendEventHash = await calcEventHash(ASSET_LIQ_SEND_EVENT_SIGNATURE, orderActorHash);

    {
      const sent = await (await facet(flash, 'OrderSenderFacet')).orderAssetSent(orderHash);
      expect(sent).to.be.equal(false);
      const liquidator = await (await facet(flash, 'OrderSenderFacet')).orderLiquidator(orderHash);
      expect(liquidator).to.be.equal(ZeroAddress);
    }

    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(liqSendEventHash);
      expect(has).to.be.equal(false);
    }

    {
      const { tx, receipt } = await gasInfo(
        'call sendOrderLiqAsset (first)',
        await (await facet(flash, 'OrderSenderFacet')).sendOrderLiqAsset(order),
      );
      expectLog({
        contract: (await facet(flash, 'OrderSenderFacet')), tx, receipt, name: 'AssetLiqSend', check: (data) => {
          expect(data.orderActorHash).to.be.equal(orderActorHash);
          expect(data.orderHash).to.be.equal(orderHash);
          expect(data.liquidator).to.be.equal(accounts.owner.address);
        },
      });
    }

    const ownerBalanceAfter = await tokens.another.balanceOf(accounts.owner.address);
    const anotherBalanceAfter = await tokens.another.balanceOf(accounts.another.address);
    const otherBalanceAfter = await tokens.another.balanceOf(accounts.other.address);
    expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - parseEther('43'));
    expect(anotherBalanceAfter).to.be.equal(anotherBalanceBefore);
    expect(otherBalanceAfter).to.be.equal(otherBalanceBefore + parseEther('43'));

    {
      const sent = await (await facet(flash, 'OrderSenderFacet')).orderAssetSent(orderHash);
      expect(sent).to.be.equal(true);
      const liquidator = await (await facet(flash, 'OrderSenderFacet')).orderLiquidator(orderHash);
      expect(liquidator).to.be.equal(accounts.owner.address);
    }

    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(liqSendEventHash);
      expect(has).to.be.equal(true);
    }

    {
      const neighborOrder = {
        ...order,
        toAmount: parseEther('69'),
        nonce: BigInt(order.nonce) + 1n,
      };
      const neighborOrderHash = await calcOrderHash(neighborOrder);
      const neighborOrderActorHash = await calcOrderActorHash(neighborOrderHash, accounts.owner.address);
      const neighborLiqSendEventHash = await calcEventHash(ASSET_LIQ_SEND_EVENT_SIGNATURE, neighborOrderActorHash);

      {
        const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(neighborLiqSendEventHash);
        expect(has).to.be.equal(false);
      }

      await tokens.another.approve(flash, parseEther('69'));

      await gasInfo(
        'call sendOrderLiqAsset (neighbor)',
        await (await facet(flash, 'OrderSenderFacet')).sendOrderLiqAsset(neighborOrder),
      );

      {
        const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(neighborLiqSendEventHash);
        expect(has).to.be.equal(true);
      }
    }
  });

  it('Should be non-sendable after deadline', async function () {
    const { accounts, flash, order } = await loadFixture(deployFixture);

    // Global deadline is ~ in 10 + 15 + 20 = 45m, 182 * 15s = 45m 30s passed
    await mine(182, { interval: 15 });

    await expectRevert(
      (await facet(flash, 'OrderSenderFacet')).connect(accounts.another).sendOrderAsset(order),
      { customError: 'OrderSendExpired()' },
    );

    await expectRevert(
      (await facet(flash, 'OrderSenderFacet')).sendOrderLiqAsset(order),
      { customError: 'OrderLiqSendExpired()' },
    );
  });

  it('Should report no-send for order', async function () {
    const { accounts, flash, order, orderHash } = await loadFixture(deployFixture);

    // Global deadline is ~ in 10 + 15 + 20 = 45m, 182 * 15s = 45m 30s passed
    await mine(182, { interval: 15 });

    const orderActorHash = await calcOrderActorHash(orderHash, accounts.owner.address);
    const noSendEventHash = await calcEventHash(ASSET_NO_SEND_EVENT_SIGNATURE, orderActorHash);

    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(noSendEventHash);
      expect(has).to.be.equal(false);
    }

    {
      const { tx, receipt } = await gasInfo(
        'call reportOrderNoSend (first)',
        await (await facet(flash, 'OrderSenderFacet')).reportOrderNoSend(order),
      );
      const orderActorHash = await calcOrderActorHash(orderHash, accounts.owner.address);
      expectLog({
        contract: (await facet(flash, 'OrderSenderFacet')), tx, receipt, name: 'AssetNoSend', check: (data) => {
          expect(data.orderActorHash).to.be.equal(orderActorHash);
          expect(data.orderHash).to.be.equal(orderHash);
          expect(data.reporter).to.be.equal(accounts.owner.address);
        },
      });
    }

    {
      const has = await (await facet(flash, 'BitStorageFacet')).hasHashStore(noSendEventHash);
      expect(has).to.be.equal(true);
    }
  });
});
