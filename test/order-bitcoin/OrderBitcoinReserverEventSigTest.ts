import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('OrderBitcoinReserverEventSigTest', function () {
  async function deployFixture() {
    const OrderBitcoinReserverEventSigTest = await ethers.getContractFactory('OrderBitcoinReserverEventSigTest');
    const sigTest = await OrderBitcoinReserverEventSigTest.deploy();
    return { sigTest };
  }

  it('Should use valid bitcoin asset no receive event signature', async function () {
    const { sigTest } = await loadFixture(deployFixture);
    await sigTest.checkAssetNoReceiveEventSig();
  });
});
