import { ethers } from 'hardhat';
import { parseEther } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { NATIVE_CRYPTO_ADDRESS } from '../../scripts/lib/contract/order/nativeCrypto';

import { OrderBitcoin } from '../../scripts/lib/contract/order-bitcoin/orderBitcoin';
import { calcOrderBitcoinHash } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinHash';
import { createOrderBitcoinSignature } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinSignature';

import { ANOTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { hoursToSeconds, nowSeconds } from '../common/time';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';
import { gasInfo } from '../common/gas';
import { BITCOIN_TEST_CHAIN_ID, parseBitcoin } from '../common/bitcoin';

describe('OrderBitcoinReceiverTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();
    const anotherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderReceiverFacet = await ethers.getContractFactory('OrderReceiverFacet');
    const receiverFacet = await OrderReceiverFacet.deploy();

    const OrderBitcoinReceiverFacet = await ethers.getContractFactory('OrderBitcoinReceiverFacet');
    const bitcoinReceiverFacet = await OrderBitcoinReceiverFacet.deploy();

    const BitStorageFacet = await ethers.getContractFactory('BitStorageFacet');
    const bitStorageFacet = await BitStorageFacet.deploy();

    const MulticallFacet = await ethers.getContractFactory('MulticallFacet');
    const multicallFacet = await MulticallFacet.deploy();

    const CollateralManagerMock = await ethers.getContractFactory('CollateralManagerMock');
    const collateralManager = await CollateralManagerMock.deploy(await collateralToken.getAddress());

    const Diamond = await ethers.getContractFactory('Diamond');
    const flash = await Diamond.deploy(ownerAccount, diamondCutFacet);

    await (await facet(flash, 'DiamondCutFacet')).diamondCut(
      [
        {
          action: FacetCutAction.Add,
          facetAddress: await receiverFacet.getAddress(),
          functionSelectors: getFunctionSelectors(receiverFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await bitcoinReceiverFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitcoinReceiverFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await bitStorageFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitStorageFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await multicallFacet.getAddress(),
          functionSelectors: getFunctionSelectors(multicallFacet.interface),
        },
      ],
      await multicallFacet.getAddress(),
      multicallFacet.interface.encodeFunctionData('multicall', [
        [
          receiverFacet.interface.encodeFunctionData('initializeOrderReceiverFacet', [
            await collateralManager.getAddress(),
          ]),
          bitcoinReceiverFacet.interface.encodeFunctionData('initializeOrderBitcoinReceiverFacet', [
            await collateralManager.getAddress(),
          ]),
        ],
      ]),
    );

    // Order from EVM to Bitcoin (from user perspective)
    const order: OrderBitcoin = {
      fromActor: anotherAccount.address,
      fromActorReceiver: anotherAccount.address,
      fromActorBitcoin: 'bc1pnuwsv2sxrq67cc2exrljh9md8mu6haykj6d6qadmhry7nl82q02qucyc04',
      fromChain: TEST_CHAIN_ID,
      fromToken: await anotherToken.getAddress(),
      fromAmount: parseEther('43'),
      toActor: otherAccount.address,
      toActorBitcoin: '3P4Nz2rw7F6twVC1aEFC32LnG4HTZ3RLJs',
      toChain: BITCOIN_TEST_CHAIN_ID,
      toToken: NATIVE_CRYPTO_ADDRESS,
      toAmount: parseBitcoin('65'),
      collateralReceiver: anotherAccount.address,
      collateralChain: ANOTHER_CHAIN_ID,
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

  it('Should receive EVM asset for Bitcoin order', async function () {
    const { accounts, flash, tokens, order, orderHash } = await loadFixture(deployFixture);

    await tokens.another.mint(accounts.another.address, parseEther('123'));
    await tokens.another.connect(accounts.another).approve(flash, parseEther('65'));

    {
      const received = await (await facet(flash, 'OrderReceiverFacet'))
        .orderAssetReceived(orderHash);
      expect(received).to.be.equal(false);
    }
    {
      const balance = await tokens.another.balanceOf(accounts.another.address);
      expect(balance).to.be.equal(parseEther('123'));
    }
    {
      const balance = await tokens.another.balanceOf(accounts.other.address);
      expect(balance).to.be.equal(0n);
    }

    {
      const orderFromSignature = await createOrderBitcoinSignature(order, accounts.another);

      await gasInfo(
        'call receiveOrderBitcoinAsset (first)',
        await (await facet(flash, 'OrderBitcoinReceiverFacet'))
          .connect(accounts.other)
          .receiveOrderBitcoinAsset(order, orderFromSignature),
      );
    }

    {
      const received = await (await facet(flash, 'OrderReceiverFacet'))
        .orderAssetReceived(orderHash);
      expect(received).to.be.equal(true);
    }
    {
      const balance = await tokens.another.balanceOf(accounts.another.address);
      expect(balance).to.be.equal(parseEther('80'));
    }
    {
      const balance = await tokens.another.balanceOf(accounts.other.address);
      expect(balance).to.be.equal(parseEther('43'));
    }
  });
});
