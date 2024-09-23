import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { OrderBitcoin } from '../../scripts/lib/contract/order-bitcoin/orderBitcoin';
import { calcOrderBitcoinHash } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinHash';

describe('OrderBitcoinHashTest', function () {
  async function deployFixture() {
    const OrderBitcoinHashTest = await ethers.getContractFactory('OrderBitcoinHashTest');
    const orderHashTest = await OrderBitcoinHashTest.deploy();
    return { orderHashTest };
  }

  it('Should use valid OrderBitcoin type hash', async function () {
    const { orderHashTest } = await loadFixture(deployFixture);
    await orderHashTest.checkOrderBitcoinTypeHash();
  });

  it('Should produce expected OrderBitcoin hash offline', async function () {
    const order: OrderBitcoin = {
      fromActor: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      fromActorReceiver: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      fromActorBitcoin: '18DowXoMUQT5EU8zPTDTrq4hrwmi8d', // Not valid actually, just to tests w/ string shorter 32
      fromChain: 512n,
      fromToken: '0x0101010101010101010101010101010101010101',
      fromAmount: 1234n,
      toActor: '0xdeadc0dedeadc0dedeadc0dedeadc0dedeadc0de',
      toActorBitcoin: 'bc1pnuwsv2sxrq67cc2exrljh9md8mu6haykj6d6qadmhry7nl82q02qucyc04',
      toChain: 1024n,
      toToken: '0x0202020202020202020202020202020202020202',
      toAmount: 3456n,
      collateralReceiver: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      collateralChain: 69n,
      collateralAmount: 1234n,
      collateralRewardable: 322n,
      collateralUnlocked: 6996n,
      deadline: 12345678901234567890n,
      createdAtBitcoin: 321123321n,
      timeToReceiveBitcoin: 8800555n,
      timeToSubmitBitcoin: 5553535n,
      timeToSend: 112233n,
      timeToLiqSend: 330101033n,
      nonce: 421337n,
    };

    const orderHash = await calcOrderBitcoinHash(order);
    expect(orderHash).to.be.equal('0x6d45ad6720d325c6ae994c34e522099b554277e25f1b8cdc1cf62a8e1341d930');
  });
});
