import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { Order } from '../../scripts/lib/contract/order/order';
import { createOrderSignature } from '../../scripts/lib/contract/order/orderSignature';

import { printGasInfo } from '../common/gas';
import { expectRevert } from '../common/revert';

describe('OrderSignatureTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const OrderSignatureTest = await ethers.getContractFactory('OrderSignatureTest');
    const signatureTest = await OrderSignatureTest.deploy();

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

    return {
      accounts: {
        owner: ownerAccount,
        other: otherAccount,
        another: anotherAccount,
      },
      signatureTest,
      order,
    };
  }

  it('Should recover signer of valid order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const orderSignature = await createOrderSignature(order, accounts.other);
    await signatureTest.testSignature(order, orderSignature, accounts.other.address);

    const gasBefore = await signatureTest.lastGasBefore();
    const gasAfterHash = await signatureTest.lastGasAfterHash();
    const gasAfterSig = await signatureTest.lastGasAfterSig();
    printGasInfo('calc order hash', gasBefore - gasAfterHash);
    printGasInfo('validate order signature', gasAfterHash - gasAfterSig);
  });

  it('Should not recover signer of invalid order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const flipHexBit = (originalHexBytes: string, charToModifyIndex: number): string => {
      function flipLastBit(hexChar: string): string {
        return (parseInt(hexChar, 16) ^ 1).toString(16);
      }

      const charToModify = originalHexBytes[charToModifyIndex];
      const modifiedChar = flipLastBit(charToModify);
      const alteredHexBytes = (
        originalHexBytes.slice(0, charToModifyIndex) +
        modifiedChar +
        originalHexBytes.slice(charToModifyIndex + 1)
      );
      return alteredHexBytes;
    };

    const orderSignature = await createOrderSignature(order, accounts.other);
    await expectRevert(
      signatureTest.testSignature(order, flipHexBit(orderSignature, 60), accounts.other.address),
      { customError: 'InvalidSignature()' },
    );
  });

  it('Should recover ERC-1271 signer of approved order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const orderSignature = await createOrderSignature(order, accounts.other);
    await signatureTest.approveSignature(accounts.other, orderSignature);
    await signatureTest.testSignature(order, orderSignature, await signatureTest.getAddress());

    const gasAfterHash = await signatureTest.lastGasAfterHash();
    const gasAfterSig = await signatureTest.lastGasAfterSig();
    printGasInfo('validate order signature (ERC-1271)', gasAfterHash - gasAfterSig);
  });

  it('Should not recover ERC-1271 signer of non-approved order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const orderSignature = await createOrderSignature(order, accounts.other);
    await expectRevert(
      signatureTest.testSignature(order, orderSignature, await signatureTest.getAddress()),
      { customError: 'InvalidSignature()' },
    );
  });
});
