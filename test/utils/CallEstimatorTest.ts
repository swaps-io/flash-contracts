import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { VoidSigner, ZeroAddress } from 'ethers';
import { expect } from 'chai';

import { expectRevert } from '../common/revert';

describe('CallEstimatorTest', function () {
  async function deployFixture() {
    const accounts = await ethers.getSigners();

    const GenericTestToken = await ethers.getContractFactory('GenericTestToken');
    const token = await GenericTestToken.deploy();

    const CallEstimatorFacet = await ethers.getContractFactory('CallEstimatorFacet');
    const estimator = await CallEstimatorFacet.deploy();

    const ProxyCallTest = await ethers.getContractFactory('ProxyCallTest');
    const proxy = await ProxyCallTest.deploy();

    return {
      accounts,
      token,
      estimator,
      proxy,
    };
  }

  it('Should estimate call gas', async function () {
    const { accounts, token, estimator } = await loadFixture(deployFixture);

    const zeroSigner = new VoidSigner(ZeroAddress, ethers.provider);

    const gas = await estimator.connect(zeroSigner).estimateCall.estimateGas(
      await token.getAddress(),
      token.interface.encodeFunctionData('mint', [accounts[0].address, 123_456_789n]),
      0n,
    );
    expect(gas).to.be.greaterThanOrEqual(73_500n);
    expect(gas).to.be.lessThanOrEqual(74_500n);
  });

  it('Should estimate call gas with value', async function () {
    const { accounts, token, estimator, proxy } = await loadFixture(deployFixture);

    await accounts[1].sendTransaction({
      to: await proxy.getAddress(),
      value: 123_456_789n,
    });

    const zeroSigner = new VoidSigner(ZeroAddress, ethers.provider);

    const gas = await estimator.connect(zeroSigner).estimateCall.estimateGas(
      await proxy.getAddress(),
      proxy.interface.encodeFunctionData('call', [
        await token.getAddress(),
        token.interface.encodeFunctionData('mintValue', [accounts[0].address]),
        123_456_789n,
      ]),
      0n,
    );
    expect(gas).to.be.greaterThanOrEqual(85_000n);
    expect(gas).to.be.lessThanOrEqual(87_000n);
  });

  it('Should revert with same error as called contract', async function () {
    const { token, estimator } = await loadFixture(deployFixture);

    const zeroSigner = new VoidSigner(ZeroAddress, ethers.provider);

    await expectRevert(
      estimator.connect(zeroSigner).estimateCall.estimateGas(
        await token.getAddress(),
        token.interface.encodeFunctionData('mint', [ZeroAddress, 123_456_789n]), // Invalid "to"
        0n,
      ),
      { customError: `ERC20InvalidReceiver("${ZeroAddress}")` },
    );
  });
});
