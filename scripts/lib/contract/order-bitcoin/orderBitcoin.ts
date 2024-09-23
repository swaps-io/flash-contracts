// See `contracts/order-bitcoin/interfaces/OrderBitcoin.sol`

export interface OrderBitcoin {
  fromActor: string;
  fromActorReceiver: string;
  fromActorBitcoin: string;
  fromChain: bigint;
  fromToken: string;
  fromAmount: bigint;
  toActor: string;
  toActorBitcoin: string;
  toChain: bigint;
  toToken: string;
  toAmount: bigint;
  collateralReceiver: string;
  collateralChain: bigint;
  collateralAmount: bigint;
  collateralRewardable: bigint;
  collateralUnlocked: bigint;
  deadline: bigint;
  createdAtBitcoin: bigint;
  timeToReceiveBitcoin: bigint;
  timeToSubmitBitcoin: bigint;
  timeToSend: bigint;
  timeToLiqSend: bigint;
  nonce: bigint;
}
