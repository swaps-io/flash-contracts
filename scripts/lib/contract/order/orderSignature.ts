import { ITypedDataSigner } from '../../evm';
import { FLASH_DOMAIN } from '../domain/domainTyped';

import { Order } from './order';
import { ORDER_TYPE } from './orderTyped';

export const createOrderSignature = async (order: Order, signer: ITypedDataSigner): Promise<string> => {
  const signature = await signer.signTypedData(FLASH_DOMAIN, ORDER_TYPE, order);
  return signature;
};
