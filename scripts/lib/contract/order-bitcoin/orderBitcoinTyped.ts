import { TypedDataFields } from '../../evm';

// See `contracts/order-bitcoin/interfaces/OrderBitcoin.sol`

export const ORDER_BITCOIN_TYPE: TypedDataFields = {
  OrderBitcoin: [
    { type: 'address', name: 'fromActor' },
    { type: 'address', name: 'fromActorReceiver' },
    { type: 'string', name: 'fromActorBitcoin' },
    { type: 'uint256', name: 'fromChain' },
    { type: 'address', name: 'fromToken' },
    { type: 'uint256', name: 'fromAmount' },
    { type: 'address', name: 'toActor' },
    { type: 'string', name: 'toActorBitcoin' },
    { type: 'uint256', name: 'toChain' },
    { type: 'address', name: 'toToken' },
    { type: 'uint256', name: 'toAmount' },
    { type: 'address', name: 'collateralReceiver' },
    { type: 'uint256', name: 'collateralChain' },
    { type: 'uint256', name: 'collateralAmount' },
    { type: 'uint256', name: 'collateralRewardable' },
    { type: 'uint256', name: 'collateralUnlocked' },
    { type: 'uint256', name: 'deadline' },
    { type: 'uint256', name: 'createdAtBitcoin' },
    { type: 'uint256', name: 'timeToReceiveBitcoin' },
    { type: 'uint256', name: 'timeToSubmitBitcoin' },
    { type: 'uint256', name: 'timeToSend' },
    { type: 'uint256', name: 'timeToLiqSend' },
    { type: 'uint256', name: 'nonce' },
  ],
};
