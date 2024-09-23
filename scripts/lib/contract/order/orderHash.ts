import { evm } from '../../evm';
import { FLASH_DOMAIN } from '../domain/domainTyped';

import { Order } from './order';
import { ORDER_TYPE } from './orderTyped';

// See `contracts/order/OrderHashLib.sol`

export const calcOrderHash = async (order: Order): Promise<string> => {
  const hash = await evm.hashTypedData(FLASH_DOMAIN, ORDER_TYPE, order);
  return hash;
};
