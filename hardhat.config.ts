import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-contract-sizer';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1_000_000,
      },
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: true,
    runOnCompile: true,
    strict: true,
    only: [
      'contracts/order/OrderReceiverFacet.sol',
      'contracts/order/OrderReceiveEstimatorFacet.sol',
      'contracts/order/OrderSenderFacet.sol',
      'contracts/order/OrderSendEstimatorFacet.sol',
      'contracts/order/OrderSenderNativeFacet.sol',
      'contracts/order/OrderSendNativeEstimatorFacet.sol',
      'contracts/order/OrderResolverFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinReceiverFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinReceiveEstimatorFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinSenderFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinSendEstimatorFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinSenderNativeFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinSendNativeEstimatorFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinResolverFacet.sol',
      'contracts/order-bitcoin/OrderBitcoinReserverFacet.sol',
      'contracts/storage/Unified3HashStorage.sol',
      'contracts/permit/TokenPermitterFacet.sol',
      'contracts/utils/MulticallFacet.sol',
      'contracts/utils/CallEstimatorFacet.sol',
      'contracts/diamond/contracts/Diamond.sol',
      'contracts/diamond/contracts/facets/DiamondCutFacet.sol',
      'contracts/diamond/contracts/facets/DiamondLoupeFacet.sol',
      'contracts/diamond/contracts/facets/OwnershipFacet.sol',
    ],
  },
};

export default config;
