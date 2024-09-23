import { keccak256, toUtf8Bytes } from 'ethers';
import { expect } from 'chai';

const checkHash = (stringValue: string, expectedHash: string): void => {
  const hash = keccak256(toUtf8Bytes(stringValue));
  expect(hash).to.be.equal(expectedHash);
};

describe('DiamondHashValueTest', function () {
  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderReceiverLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderReceiverLib', '0xba2de5bd81f89ee2196845b085776d4f123bf41ad08f63ccc91e9938b4ba9600');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderReceiverFacet.Initializable" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderReceiverFacet.Initializable', '0x3a9d36521d0fff9239e47be984630c34c26f0c274020712139ae27e7b2c1da3b');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderSenderLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderSenderLib', '0x0c6a86935de64f6364c5e72882bf309a89de645e945d28c0f8534d69773038ca');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderResolverLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderResolverLib', '0x93c089dec1346f3c9d111f6974d7849e6029bef026e900d74d94361b46efcbf1');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderResolverFacet.Initializable" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderResolverFacet.Initializable', '0x54caa9b968ad4f9d88346785551baf135de04b06a3673fc87a25276093a8f04b');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.NativeTokenLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.NativeTokenLib', '0x337b0609cdcd3f64f491b69277bc0ab4cdb825d137e964d0fe33c6c6f2cef5f2');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.NativeTokenFacet.Initializable" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.NativeTokenFacet.Initializable', '0x7c5ae8b5619da04b92d56f3e00fbadd624df354c550ff7cda188db92de1fab29');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderBitcoinReceiverLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderBitcoinReceiverLib', '0x87f39ff54ecb920bfca73a23e88b6ba8a5a1796b3669fda256411095324735ba');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderBitcoinReceiverFacet.Initializable" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderBitcoinReceiverFacet.Initializable', '0x55c5e78283d576cea7c0fff2ed9ad38f7ddadac25819e68ec2df32b0a4ae2608');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderBitcoinResolverLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderBitcoinResolverLib', '0x4fad9b7f78d6c2e89342c5e126073303c44ab311d9623cbb142039e70728a281');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderBitcoinResolverFacet.Initializable" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderBitcoinResolverFacet.Initializable', '0x91fc62a68072cdc330880b4323a0ce513588ea1a4e9724da4d4ad2f3c81af6c6');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderBitcoinReserverLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderBitcoinReserverLib', '0x40ccfeca7c7360001a663582fe77cdd21009cbcfb89403e037bcb21c5dfab0c5');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.OrderBitcoinReserverFacet.Initializable" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.OrderBitcoinReserverFacet.Initializable', '0x189fd8400ab77cd3f5cae65b56e3e93d1ca669bf2f062d1d373cdcde731bdd1f');
  });

  it('Should use expected "com.swaps-io.flash.diamond.storage.BitStorageLib" hash', async function () {
    checkHash('com.swaps-io.flash.diamond.storage.BitStorageLib', '0xd7e6a87efd0a7da6154e9459151089509a18a94a6a4072527f9ec5d1eaed4f28');
  });
});
