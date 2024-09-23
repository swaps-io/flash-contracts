import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { Order } from '../../scripts/lib/contract/order/order';
import { calcOrderHash } from '../../scripts/lib/contract/order/orderHash';

describe('OrderHashTest', function () {
  async function deployFixture() {
    const OrderHashTest = await ethers.getContractFactory('OrderHashTest');
    const orderHashTest = await OrderHashTest.deploy();
    return { orderHashTest };
  }

  it('Should use valid Order type hash', async function () {
    const { orderHashTest } = await loadFixture(deployFixture);
    await orderHashTest.checkOrderTypeHash();
  });

  it('Should produce expected Order hash offline', async function () {
    const order: Order = {
      fromActor: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      fromActorReceiver: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      fromChain: 512n,
      fromToken: '0x0101010101010101010101010101010101010101',
      fromAmount: 1234n,
      toActor: '0xdeadc0dedeadc0dedeadc0dedeadc0dedeadc0de',
      toChain: 1024n,
      toToken: '0x0202020202020202020202020202020202020202',
      toAmount: 3456n,
      collateralReceiver: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      collateralChain: 69n,
      collateralAmount: 1234n,
      collateralRewardable: 322n,
      collateralUnlocked: 6996n,
      deadline: 12345678901234567890n,
      timeToSend: 112233n,
      timeToLiqSend: 330101033n,
      nonce: 421337n,
    };

    const orderHash = await calcOrderHash(order);
    expect(orderHash).to.be.equal('0x044807f64a380eac8ee1fff9faca0f89c7015d9461afdd6fd567acc5016d4b7c');
  });
});
