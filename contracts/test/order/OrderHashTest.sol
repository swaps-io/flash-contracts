// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderHashLib} from "../../order/OrderHashLib.sol";

contract OrderHashTest {
    error OrderTypeHashMismatch(bytes32 hash, bytes32 expectedHash);

    // prettier-ignore
    bytes32 private constant ORDER_TYPE_HASH = keccak256(
        "Order("
            "address fromActor,"
            "address fromActorReceiver,"
            "uint256 fromChain,"
            "address fromToken,"
            "uint256 fromAmount,"
            "address toActor,"
            "uint256 toChain,"
            "address toToken,"
            "uint256 toAmount,"
            "address collateralReceiver,"
            "uint256 collateralChain,"
            "uint256 collateralAmount,"
            "uint256 collateralRewardable,"
            "uint256 collateralUnlocked,"
            "uint256 deadline,"
            "uint256 timeToSend,"
            "uint256 timeToLiqSend,"
            "uint256 nonce"
        ")"
    );

    function checkOrderTypeHash() external pure {
        if (OrderHashLib.ORDER_TYPE_HASH != ORDER_TYPE_HASH) {
            revert OrderTypeHashMismatch(OrderHashLib.ORDER_TYPE_HASH, ORDER_TYPE_HASH);
        }
    }
}
