import { ethers } from 'hardhat';

export { FacetCutAction } from '../../scripts/lib/contract/diamond/facetCutAction';

import {
  Diamond,
  BitStorageFacet,
  DiamondCutFacet,
  OrderBitcoinReserverFacet,
  OrderBitcoinResolverFacet,
  OrderBitcoinSenderFacet,
  OrderReceiverFacet,
  OrderResolverFacet,
  OrderSenderFacet,
  MulticallFacet,
  OrderBitcoinSenderNativeFacet,
  OrderSenderNativeFacet,
  NativeTokenFacet,
  TokenPermitterFacet,
  OwnershipFacet,
  OrderBitcoinReceiverFacet,
  OrderReceiveEstimatorFacet,
  OrderReceiverManualNativeFacet,
  OrderReceiveManualNativeEstimatorFacet,
  OrderBitcoinReceiveEstimatorFacet,
  OrderBitcoinReceiverManualNativeFacet,
  OrderBitcoinReceiveManualNativeEstimatorFacet,
} from '../../typechain-types';

type Facets = {
  DiamondCutFacet: DiamondCutFacet,
  OwnershipFacet: OwnershipFacet,
  MulticallFacet: MulticallFacet,
  TokenPermitterFacet: TokenPermitterFacet,
  BitStorageFacet: BitStorageFacet,
  NativeTokenFacet: NativeTokenFacet,
  OrderReceiverFacet: OrderReceiverFacet,
  OrderReceiveEstimatorFacet: OrderReceiveEstimatorFacet,
  OrderReceiverManualNativeFacet: OrderReceiverManualNativeFacet,
  OrderReceiveManualNativeEstimatorFacet: OrderReceiveManualNativeEstimatorFacet,
  OrderSenderFacet: OrderSenderFacet,
  OrderSenderNativeFacet: OrderSenderNativeFacet,
  OrderResolverFacet: OrderResolverFacet,
  OrderBitcoinReserverFacet: OrderBitcoinReserverFacet,
  OrderBitcoinReceiverFacet: OrderBitcoinReceiverFacet,
  OrderBitcoinReceiveEstimatorFacet: OrderBitcoinReceiveEstimatorFacet,
  OrderBitcoinReceiverManualNativeFacet: OrderBitcoinReceiverManualNativeFacet,
  OrderBitcoinReceiveManualNativeEstimatorFacet: OrderBitcoinReceiveManualNativeEstimatorFacet,
  OrderBitcoinSenderFacet: OrderBitcoinSenderFacet,
  OrderBitcoinSenderNativeFacet: OrderBitcoinSenderNativeFacet,
  OrderBitcoinResolverFacet: OrderBitcoinResolverFacet,
};

export const facet = async <FN extends keyof Facets>(diamond: Diamond, name: FN): Promise<Facets[FN]> => {
  return await ethers.getContractAt(name, diamond) as unknown as Facets[FN];
};
