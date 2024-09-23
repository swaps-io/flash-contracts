// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";

import {IOrderSenderNative} from "./interfaces/IOrderSenderNative.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderActorHashLib} from "./OrderActorHashLib.sol";
import {OrderSenderLib, OrderSenderStorage} from "./OrderSenderLib.sol";
import {OrderSenderNativeLib} from "./OrderSenderNativeLib.sol";

contract OrderSenderNativeFacet is IOrderSenderNative {
    function sendOrderAssetNative(Order calldata order_) external {
        if (!EnvLib.isActiveDeadline(order_.deadline + order_.timeToSend)) revert OrderSendExpired();
        if (msg.sender != order_.toActor) revert SendCallerMismatch();
        (bytes32 orderHash, bytes32 orderSendEventHash) = _validateOrder(order_);

        BitStorageLib.storeBit(orderSendEventHash);

        OrderSenderNativeLib.sendOrderAsset(order_.fromActorReceiver, order_.toAmount);

        emit AssetSend(orderHash);
    }

    function sendOrderLiqAssetNative(Order calldata order_) external {
        if (EnvLib.isActiveDeadline(order_.deadline + order_.timeToSend)) revert OrderLiqSendUnreached();
        if (!EnvLib.isActiveDeadline(order_.deadline + order_.timeToSend + order_.timeToLiqSend)) revert OrderLiqSendExpired();
        (bytes32 orderHash, ) = _validateOrder(order_);

        OrderSenderStorage storage s = OrderSenderLib.store();
        s.orderLiquidator[orderHash] = msg.sender;
        bytes32 orderActorHash = OrderActorHashLib.calcOrderActorHash(orderHash, msg.sender);
        BitStorageLib.storeBit(EventHashLib.calcEventHash(OrderSenderLib.ASSET_LIQ_SEND_SIG, orderActorHash));

        OrderSenderNativeLib.sendOrderAsset(order_.fromActorReceiver, order_.toAmount);

        emit AssetLiqSend(orderActorHash, orderHash, msg.sender);
    }

    function _validateOrder(Order calldata order_) private view returns (bytes32 orderHash, bytes32 orderSendEventHash) {
        if (!EnvLib.isThisChain(order_.toChain)) revert SendChainMismatch();
        orderHash = OrderHashLib.calcOrderHash(order_);
        orderSendEventHash = EventHashLib.calcEventHash(OrderSenderLib.ASSET_SEND_SIG, orderHash);
        if (OrderSenderLib.orderAssetSent(orderHash, orderSendEventHash)) revert OrderAlreadySent();
        if (order_.toToken != OrderSenderNativeLib.NATIVE_ADDRESS) revert OrderSendNotNative();
    }
}
