// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {Estimator} from "../utils/Estimator.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {IOrderSendNativeEstimator} from "./interfaces/IOrderSendNativeEstimator.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderActorHashLib} from "./OrderActorHashLib.sol";
import {OrderSenderLib, OrderSenderStorage} from "./OrderSenderLib.sol";

contract OrderSendNativeEstimatorFacet is IOrderSendNativeEstimator, Estimator {
    function estimateSendOrderAssetNative(Order calldata order_, address caller_) external payable onlyEstimate {
        _estimateSendOrderAssetNative(order_, caller_, NativeLib.VALUE_ORIGINAL_BIT);
    }

    function estimateSendOrderAssetNative(Order calldata order_, address caller_, uint256 value_) external payable onlyEstimate {
        _estimateSendOrderAssetNative(order_, caller_, value_);
    }

    function estimateSendOrderLiqAssetNative(Order calldata order_, address caller_) external payable onlyEstimate {
        _estimateSendOrderLiqAssetNative(order_, caller_, NativeLib.VALUE_ORIGINAL_BIT);
    }

    function estimateSendOrderLiqAssetNative(Order calldata order_, address caller_, uint256 value_) external payable onlyEstimate {
        _estimateSendOrderLiqAssetNative(order_, caller_, value_);
    }

    function _estimateSendOrderAssetNative(Order calldata order_, address caller_, uint256 value_) private {
        if (!EnvLib.isActiveDeadline(order_.deadline + order_.timeToSend)) revert OrderSendExpired();
        if (caller_ != order_.toActor) revert SendCallerMismatch();
        (bytes32 orderHash, bytes32 orderSendEventHash) = _validateOrder(order_);

        BitStorageLib.storeBit(orderSendEventHash);

        NativeLib.transferFrom(caller_, order_.fromActorReceiver, order_.toAmount, value_);

        emit AssetSend(orderHash);
    }

    function _estimateSendOrderLiqAssetNative(Order calldata order_, address caller_, uint256 value_) private {
        if (EnvLib.isActiveDeadline(order_.deadline + order_.timeToSend)) revert OrderLiqSendUnreached();
        if (!EnvLib.isActiveDeadline(order_.deadline + order_.timeToSend + order_.timeToLiqSend)) revert OrderLiqSendExpired();
        (bytes32 orderHash, ) = _validateOrder(order_);

        OrderSenderStorage storage s = OrderSenderLib.store();
        s.orderLiquidator[orderHash] = caller_;
        bytes32 orderActorHash = OrderActorHashLib.calcOrderActorHash(orderHash, caller_);
        BitStorageLib.storeBit(EventHashLib.calcEventHash(OrderSenderLib.ASSET_LIQ_SEND_SIG, orderActorHash));

        NativeLib.transferFrom(caller_, order_.fromActorReceiver, order_.toAmount, value_);

        emit AssetLiqSend(orderActorHash, orderHash, caller_);
    }

    function _validateOrder(Order calldata order_) private view returns (bytes32 orderHash, bytes32 orderSendEventHash) {
        if (!EnvLib.isThisChain(order_.toChain)) revert SendChainMismatch();
        orderHash = OrderHashLib.calcOrderHash(order_);
        orderSendEventHash = EventHashLib.calcEventHash(OrderSenderLib.ASSET_SEND_SIG, orderHash);
        if (OrderSenderLib.orderAssetSent(orderHash, orderSendEventHash)) revert OrderAlreadySent();
        if (order_.toToken != NativeLib.NATIVE_ADDRESS) revert OrderSendNotNative();
    }
}
