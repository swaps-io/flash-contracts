// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {DomainLib} from "../domain/DomainLib.sol";

import {OrderBitcoin} from "./interfaces/OrderBitcoin.sol";
import {OrderBitcoinHashable} from "./interfaces/OrderBitcoinHashable.sol";

library OrderBitcoinHashLib {
    // Typed data hash of "OrderBitcoin" structure type
    bytes32 internal constant ORDER_TYPE_HASH = 0x885c06a2c060bd2c435d41ddde135512de9d5f73937872f48e8bfc1dbda80306;

    function calcOrderHash(OrderBitcoin calldata order_) internal pure returns (bytes32) {
        return DomainLib.calcDomainHash(keccak256(abi.encode(ORDER_TYPE_HASH, _toHashable(order_))));
    }

    function _toHashable(OrderBitcoin calldata order_) private pure returns (OrderBitcoinHashable memory h) {
        h.fromActor = order_.fromActor;
        h.fromActorReceiver = order_.fromActorReceiver;
        h.fromActorBitcoin = keccak256(bytes(order_.fromActorBitcoin));
        h.fromChain = order_.fromChain;
        h.fromToken = order_.fromToken;
        h.fromAmount = order_.fromAmount;
        h.toActor = order_.toActor;
        h.toActorBitcoin = keccak256(bytes(order_.toActorBitcoin));
        h.toChain = order_.toChain;
        h.toToken = order_.toToken;
        h.toAmount = order_.toAmount;
        h.collateralReceiver = order_.collateralReceiver;
        h.collateralChain = order_.collateralChain;
        h.collateralAmount = order_.collateralAmount;
        h.collateralRewardable = order_.collateralRewardable;
        h.collateralUnlocked = order_.collateralUnlocked;
        h.deadline = order_.deadline;
        h.createdAtBitcoin = order_.createdAtBitcoin;
        h.timeToReceiveBitcoin = order_.timeToReceiveBitcoin;
        h.timeToSubmitBitcoin = order_.timeToSubmitBitcoin;
        h.timeToSend = order_.timeToSend;
        h.timeToLiqSend = order_.timeToLiqSend;
        h.nonce = order_.nonce;
    }
}
