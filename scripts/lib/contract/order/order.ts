// See `contracts/order/interfaces/Order.sol`

export interface Order {
  fromActor: string;
  fromActorReceiver: string;
  fromChain: bigint;
  fromToken: string;
  fromAmount: bigint;
  toActor: string;
  toChain: bigint;
  toToken: string;
  toAmount: bigint;
  collateralReceiver: string;
  collateralChain: bigint;
  collateralAmount: bigint;
  collateralRewardable: bigint;
  collateralUnlocked: bigint;
  deadline: bigint;
  timeToSend: bigint;
  timeToLiqSend: bigint;
  nonce: bigint;
}
