import { ethers } from 'hardhat';
import { parseEther, ZeroHash } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { Order } from '../../scripts/lib/contract/order/order';
import { calcOrderHash } from '../../scripts/lib/contract/order/orderHash';

import { hoursToSeconds, nowSeconds } from '../common/time';
import { gasInfo } from '../common/gas';
import { ANOTHER_CHAIN_ID, OTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { expectLog } from '../common/log';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';

describe('DynamicReceiveAdapterTest', function () {
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

    const DynamicReceiveAdapter = await ethers.getContractFactory('DynamicReceiveAdapter');
    const dynamicReceiveAdapter = await DynamicReceiveAdapter.deploy(flash, collateralManager);

    const AdapterOrderResolverTest = await ethers.getContractFactory('AdapterOrderResolverTest');
    const adapterOrderResolver = await AdapterOrderResolverTest.deploy(flash, dynamicReceiveAdapter);

    const dynOrder: Order = {
      fromActor: await dynamicReceiveAdapter.getAddress(), // Required for dynamic receive order
      fromActorReceiver: otherAccount.address,
      fromChain: TEST_CHAIN_ID,
      fromToken: await otherToken.getAddress(),
      fromAmount: parseEther('65'), // Min "from" amount, can be greater
      toActor: await adapterOrderResolver.getAddress(), // Required for dynamic receive order
      toChain: ANOTHER_CHAIN_ID,
      toToken: await anotherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
      collateralChain: OTHER_CHAIN_ID,
      collateralAmount: parseEther('21'),
      collateralRewardable: 0n,
      collateralUnlocked: parseEther('25'), // Doesn't matter - replaced by current external unlock counter
      deadline: await nowSeconds() + hoursToSeconds(1n),
      timeToSend: 0n,
      timeToLiqSend: 0n,
      nonce: 13377331n,
    };
    const dynOrderHash = await calcOrderHash(dynOrder);

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
      dynamicReceiveAdapter,
      adapterOrderResolver,
      dynOrder,
      dynOrderHash,
    };
  }

  it('Should receive dynamic adapter order asset', async function () {
    const {
      tokens,
      flash,
      collateralManager,
      dynamicReceiveAdapter,
      adapterOrderResolver,
      dynOrder,
      dynOrderHash,
    } = await loadFixture(deployFixture);

    const fromAmount = parseEther('123'); // >= 65 (✅)
    await tokens.other.mint(
      await dynamicReceiveAdapter.getAddress(),
      fromAmount,
    );

    const unlockCounter = parseEther('22'); // >= 21 (✅)
    await collateralManager.setExternalUnlockCounter(
      dynOrder.toActor,
      dynOrder.collateralChain,
      unlockCounter,
    );

    const order: Order = {
      ...dynOrder,
      fromAmount,
      collateralUnlocked: unlockCounter,
    };
    const orderHash = await calcOrderHash(order);

    const dynOrderToSignature = '0x0123456701234567012345670123456701234567012345670123456701234567012345670123456701234567012345670123456701234567012345670123456789';
    await adapterOrderResolver.setExpectedValidSignatureParams(dynOrderHash, dynOrderToSignature);

    {
      const receiveOrderHash = await dynamicReceiveAdapter.orderDynamicAssetReceived(dynOrderHash);
      expect(receiveOrderHash).to.be.equal(ZeroHash);
    }
    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(false);
    }
    {
      const balance = await tokens.other.balanceOf(order.toActor);
      expect(balance).to.be.equal(0n);
    }

    {
      const { tx, receipt } = await gasInfo(
        'call receiveOrderDynamicAsset (first)',
        await dynamicReceiveAdapter.receiveOrderDynamicAsset(
          dynOrder,
          dynOrderToSignature,
        ),
      );
      expectLog({
        contract: dynamicReceiveAdapter, tx, receipt, name: 'AssetDynamicReceive', check: (data) => {
          expect(data.dynOrderHash).to.be.equal(dynOrderHash);
          expect(data.orderHash).to.be.equal(orderHash);
        },
      });
    }

    {
      const receiveOrderHash = await dynamicReceiveAdapter.orderDynamicAssetReceived(dynOrderHash);
      expect(receiveOrderHash).to.be.equal(orderHash);
    }
    {
      const received = await (await facet(flash, 'OrderReceiverFacet')).orderAssetReceived(orderHash);
      expect(received).to.be.equal(true);
    }
    {
      const balance = await tokens.other.balanceOf(order.toActor);
      expect(balance).to.be.equal(fromAmount);
    }
  });
});
