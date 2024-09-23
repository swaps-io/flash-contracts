import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('OrderSenderEventSigTest', function () {
  async function deployFixture() {
    const OrderSenderEventSigTest = await ethers.getContractFactory('OrderSenderEventSigTest');
    const sigTest = await OrderSenderEventSigTest.deploy();
    return { sigTest };
  }

  it('Should use valid asset send event signature', async function () {
    const { sigTest } = await loadFixture(deployFixture);
    await sigTest.checkAssetSendEventSig();
  });

  it('Should use valid asset liq send event signature', async function () {
    const { sigTest } = await loadFixture(deployFixture);
    await sigTest.checkAssetLiqSendEventSig();
  });

  it('Should use valid asset no send event signature', async function () {
    const { sigTest } = await loadFixture(deployFixture);
    await sigTest.checkAssetNoSendEventSig();
  });
});
