import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('OrderReceiverEventSigTest', function () {
  async function deployFixture() {
    const OrderReceiverEventSigTest = await ethers.getContractFactory('OrderReceiverEventSigTest');
    const sigTest = await OrderReceiverEventSigTest.deploy();
    return { sigTest };
  }

  it('Should use valid asset receive event signature', async function () {
    const { sigTest } = await loadFixture(deployFixture);
    await sigTest.checkAssetReceiveEventSig();
  });
});
