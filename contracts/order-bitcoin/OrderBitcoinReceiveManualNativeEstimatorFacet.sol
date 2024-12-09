// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {OrderReceiverLib} from "../order/OrderReceiverLib.sol";
import {OrderReceiverManualNativeLib, NativeLib} from "../order/OrderReceiverManualNativeLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";
import {Estimator} from "../utils/Estimator.sol";

import {IOrderBitcoinReceiveManualNativeEstimator} from "./interfaces/IOrderBitcoinReceiveManualNativeEstimator.sol";

import {OrderBitcoinReceiverLib} from "./OrderBitcoinReceiverLib.sol";
import {OrderBitcoinHashLib, OrderBitcoin} from "./OrderBitcoinHashLib.sol";

contract OrderBitcoinReceiveManualNativeEstimatorFacet is IOrderBitcoinReceiveManualNativeEstimator, Estimator {
    function estimateReceiveOrderBitcoinAssetManualNative(
        OrderBitcoin calldata order_,
        bytes calldata toSignature_,
        bytes calldata toPostData_,
        address caller_
    ) external payable onlyEstimate {
        _receiveOrderBitcoinAssetManualNative(order_, toSignature_, toPostData_, caller_, NativeLib.VALUE_ORIGINAL_BIT);
    }

    function estimateReceiveOrderBitcoinAssetManualNative(
        OrderBitcoin calldata order_,
        bytes calldata toSignature_,
        bytes calldata toPostData_,
        address caller_,
        uint256 value_
    ) external payable onlyEstimate {
        _receiveOrderBitcoinAssetManualNative(order_, toSignature_, toPostData_, caller_, value_);
    }

    function _receiveOrderBitcoinAssetManualNative(
        OrderBitcoin calldata order_,
        bytes calldata toSignature_,
        bytes calldata toPostData_,
        address caller_,
        uint256 value_
    ) private {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (caller_ != order_.fromActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();
        if (order_.fromToken != NativeLib.NATIVE_ADDRESS) revert OrderReceiveNotNative();

        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        SignatureLib.validateSignature(orderHash, toSignature_, order_.toActor);
        OrderReceiverManualNativeLib.validatePostData(order_.nonce, toPostData_);

        OrderBitcoinReceiverLib.store().collateralLocker.commitLock(order_.toActor, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        OrderReceiverManualNativeLib.transferFrom(orderHash, order_.nonce, caller_, order_.toActor, order_.fromAmount, toPostData_, value_);

        emit AssetReceive(orderHash);
    }
}
