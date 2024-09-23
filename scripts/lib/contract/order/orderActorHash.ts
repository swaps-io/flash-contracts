import { evm } from '../../evm';

// See `contracts/order/OrderActorHashLib.sol`

export const calcOrderActorHash = async (orderHash: string, actor: string): Promise<string> => {
  const orderActorHashData = await evm.abiEncode(['bytes32', 'address'], [orderHash, actor]);
  const orderActorHash = await evm.keccak256(orderActorHashData);
  return orderActorHash;
};
