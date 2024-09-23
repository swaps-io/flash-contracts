import { evm } from '../../evm';
import { FLASH_DOMAIN } from '../domain/domainTyped';

import { OrderBitcoin } from './orderBitcoin';
import { ORDER_BITCOIN_TYPE } from './orderBitcoinTyped';

// See `contracts/order-bitcoin/OrderBitcoinHashLib.sol`

export const calcOrderBitcoinHash = async (order: OrderBitcoin): Promise<string> => {
  const hash = await evm.hashTypedData(FLASH_DOMAIN, ORDER_BITCOIN_TYPE, order);
  return hash;
};
