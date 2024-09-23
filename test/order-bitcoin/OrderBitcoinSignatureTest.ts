import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import { OrderBitcoin } from '../../scripts/lib/contract/order-bitcoin/orderBitcoin';
import { createOrderBitcoinSignature } from '../../scripts/lib/contract/order-bitcoin/orderBitcoinSignature';

import { printGasInfo } from '../common/gas';
import { expectRevert } from '../common/revert';

describe('OrderBitcoinSignatureTest', function () {
  async function deployFixture() {
    const [ownerAccount, otherAccount, anotherAccount] = await ethers.getSigners();

    const OrderBitcoinSignatureTest = await ethers.getContractFactory('OrderBitcoinSignatureTest');
    const signatureTest = await OrderBitcoinSignatureTest.deploy();

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

  it('Should recover signer of valid Bitcoin order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const orderSignature = await createOrderBitcoinSignature(order, accounts.other);
    await signatureTest.testSignature(order, orderSignature, accounts.other.address);

    const gasBefore = await signatureTest.lastGasBefore();
    const gasAfterHash = await signatureTest.lastGasAfterHash();
    const gasAfterSig = await signatureTest.lastGasAfterSig();
    printGasInfo('calc bitcoin order hash', gasBefore - gasAfterHash);
    printGasInfo('validate bitcoin order signature', gasAfterHash - gasAfterSig);
  });

  it('Should not recover signer of invalid Bitcoin order signature', async function () {
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

    const orderSignature = await createOrderBitcoinSignature(order, accounts.other);
    await expectRevert(
      signatureTest.testSignature(order, flipHexBit(orderSignature, 60), accounts.other.address),
      { customError: 'InvalidSignature()' },
    );
  });

  it('Should recover ERC-1271 signer of approved Bitcoin order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const orderSignature = await createOrderBitcoinSignature(order, accounts.other);
    await signatureTest.approveSignature(accounts.other, orderSignature);
    await signatureTest.testSignature(order, orderSignature, await signatureTest.getAddress());

    const gasAfterHash = await signatureTest.lastGasAfterHash();
    const gasAfterSig = await signatureTest.lastGasAfterSig();
    printGasInfo('validate bitcoin order signature (ERC-1271)', gasAfterHash - gasAfterSig);
  });

  it('Should not recover ERC-1271 signer of non-approved Bitcoin order signature', async function () {
    const { accounts, signatureTest, order } = await loadFixture(deployFixture);

    const orderSignature = await createOrderBitcoinSignature(order, accounts.other);
    await expectRevert(
      signatureTest.testSignature(order, orderSignature, await signatureTest.getAddress()),
      { customError: 'InvalidSignature()' },
    );
  });
});
