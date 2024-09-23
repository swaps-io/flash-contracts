import { ITypedDataSigner } from '../../evm';
import { FLASH_DOMAIN } from '../domain/domainTyped';

import { OrderBitcoin } from './orderBitcoin';
import { ORDER_BITCOIN_TYPE } from './orderBitcoinTyped';

export const createOrderBitcoinSignature = async (order: OrderBitcoin, signer: ITypedDataSigner): Promise<string> => {
  const signature = await signer.signTypedData(FLASH_DOMAIN, ORDER_BITCOIN_TYPE, order);
  return signature;
};
