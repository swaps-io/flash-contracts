import { ethers } from 'hardhat';
import { parseEther } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { NATIVE_CRYPTO_ADDRESS } from '../../scripts/lib/contract/order/nativeCrypto';

import { OrderBitcoin } from '../../scripts/lib/contract/order-bitcoin/orderBitcoin';
import { calcOrderBitcoinHash } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinHash';

import { ANOTHER_CHAIN_ID, TEST_CHAIN_ID } from '../common/chainId';
import { hoursToSeconds, nowSeconds } from '../common/time';
import { FacetCutAction, facet } from '../common/facet';
import { getFunctionSelectors } from '../common/interface';
import { gasInfo } from '../common/gas';
import { BITCOIN_TEST_CHAIN_ID, parseBitcoin } from '../common/bitcoin';

describe('OrderBitcoinSenderTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const collateralToken = await GenericTestToken.deploy();
    const otherToken = await GenericTestToken.deploy();
    const anotherToken = await GenericTestToken.deploy();

    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const OrderSenderFacet = await ethers.getContractFactory('OrderSenderFacet');
    const senderFacet = await OrderSenderFacet.deploy();

    const OrderBitcoinSenderFacet = await ethers.getContractFactory('OrderBitcoinSenderFacet');
    const bitcoinSenderFacet = await OrderBitcoinSenderFacet.deploy();

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
          facetAddress: await senderFacet.getAddress(),
          functionSelectors: getFunctionSelectors(senderFacet.interface),
        },
        {
          action: FacetCutAction.Add,
          facetAddress: await bitcoinSenderFacet.getAddress(),
          functionSelectors: getFunctionSelectors(bitcoinSenderFacet.interface),
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
      '0x0000000000000000000000000000000000000000',
      '0x',
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
      toChain: TEST_CHAIN_ID,
      toToken: await anotherToken.getAddress(),
      toAmount: parseEther('43'),
      collateralReceiver: otherAccount.address,
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

  it('Should send EVM asset for Bitcoin order', async function () {
    const { accounts, flash, tokens, order, orderHash } = await loadFixture(deployFixture);

    await tokens.another.mint(accounts.another.address, parseEther('123'));
    await tokens.another.connect(accounts.another).approve(flash, parseEther('65'));

    {
      const sent = await (await facet(flash, 'OrderSenderFacet'))
        .orderAssetSent(orderHash);
      expect(sent).to.be.equal(false);
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
      await gasInfo(
        'call sendOrderBitcoinAsset (first)',
        await (await facet(flash, 'OrderBitcoinSenderFacet'))
          .connect(accounts.another)
          .sendOrderBitcoinAsset(order),
      );
    }

    {
      const sent = await (await facet(flash, 'OrderSenderFacet'))
        .orderAssetSent(orderHash);
      expect(sent).to.be.equal(true);
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
