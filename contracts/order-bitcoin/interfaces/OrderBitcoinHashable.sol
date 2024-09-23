// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

struct OrderBitcoinHashable {
    address fromActor;
    address fromActorReceiver;
    bytes32 fromActorBitcoin;
    uint256 fromChain;
    address fromToken;
    uint256 fromAmount;
    address toActor;
    bytes32 toActorBitcoin;
    uint256 toChain;
    address toToken;
    uint256 toAmount;
    address collateralReceiver;
    uint256 collateralChain;
    uint256 collateralAmount;
    uint256 collateralRewardable;
    uint256 collateralUnlocked;
    uint256 deadline;
    uint256 createdAtBitcoin;
    uint256 timeToReceiveBitcoin;
    uint256 timeToSubmitBitcoin;
    uint256 timeToSend;
    uint256 timeToLiqSend;
    uint256 nonce;
}
