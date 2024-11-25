// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";
import {Estimator} from "../utils/Estimator.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {IOrderReceiveManualNativeEstimator} from "./interfaces/IOrderReceiveManualNativeEstimator.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderReceiverLib} from "./OrderReceiverLib.sol";

contract OrderReceiveManualNativeEstimatorFacet is IOrderReceiveManualNativeEstimator, Estimator {
    function estimateReceiveOrderAssetManualNative(Order calldata order_, bytes calldata toSignature_, address caller_) external payable onlyEstimate {
        _estimateReceiveOrderAssetManualNative(order_, toSignature_, caller_, NativeLib.VALUE_ORIGINAL_BIT);
    }

    function estimateReceiveOrderAssetManualNative(
        Order calldata order_,
        bytes calldata toSignature_,
        address caller_,
        uint256 value_
    ) external payable onlyEstimate {
        _estimateReceiveOrderAssetManualNative(order_, toSignature_, caller_, value_);
    }

    function _estimateReceiveOrderAssetManualNative(Order calldata order_, bytes calldata toSignature_, address caller_, uint256 value_) private {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (caller_ != order_.fromActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();
        if (order_.fromToken != NativeLib.NATIVE_ADDRESS) revert OrderReceiveNotNative();

        bytes32 orderHash = OrderHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        if (toSignature_.length != 0) SignatureLib.validateSignature(orderHash, toSignature_, order_.toActor);

        OrderReceiverLib.store().collateralLocker.commitLock(order_.toActor, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        NativeLib.transferFrom(caller_, order_.toActor, order_.fromAmount, value_);

        emit AssetReceive(orderHash);
    }
}
