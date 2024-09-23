import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('FlashDomainTest', function () {
  async function deployFixture() {
    const FlashDomainTest = await ethers.getContractFactory('FlashDomainTest');
    const flashDomainTest = await FlashDomainTest.deploy();
    return { flashDomainTest };
  }

  it('Should use valid flash domain separator', async function () {
    const { flashDomainTest } = await loadFixture(deployFixture);
    await flashDomainTest.checkDomainSeparator();
  });
});
