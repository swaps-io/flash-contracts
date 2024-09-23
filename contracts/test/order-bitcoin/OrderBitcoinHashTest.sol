// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderBitcoinHashLib} from "../../order-bitcoin/OrderBitcoinHashLib.sol";

contract OrderBitcoinHashTest {
    error OrderBitcoinTypeHashMismatch(bytes32 hash, bytes32 expectedHash);

    // prettier-ignore
    bytes32 private constant ORDER_TYPE_HASH = keccak256(
        "OrderBitcoin("
            "address fromActor,"
            "address fromActorReceiver,"
            "string fromActorBitcoin,"
            "uint256 fromChain,"
            "address fromToken,"
            "uint256 fromAmount,"
            "address toActor,"
            "string toActorBitcoin,"
            "uint256 toChain,"
            "address toToken,"
            "uint256 toAmount,"
            "address collateralReceiver,"
            "uint256 collateralChain,"
            "uint256 collateralAmount,"
            "uint256 collateralRewardable,"
            "uint256 collateralUnlocked,"
            "uint256 deadline,"
            "uint256 createdAtBitcoin,"
            "uint256 timeToReceiveBitcoin,"
            "uint256 timeToSubmitBitcoin,"
            "uint256 timeToSend,"
            "uint256 timeToLiqSend,"
            "uint256 nonce"
        ")"
    );

    function checkOrderBitcoinTypeHash() external pure {
        if (OrderBitcoinHashLib.ORDER_TYPE_HASH != ORDER_TYPE_HASH) {
            revert OrderBitcoinTypeHashMismatch(OrderBitcoinHashLib.ORDER_TYPE_HASH, ORDER_TYPE_HASH);
        }
    }
}
