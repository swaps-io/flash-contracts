// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";
import {Estimator} from "../utils/Estimator.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {IOrderReceiveManualNativeEstimator} from "./interfaces/IOrderReceiveManualNativeEstimator.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderReceiverLib} from "./OrderReceiverLib.sol";
import {ManualNativeNonceLib} from "./ManualNativeNonceLib.sol";
import {OrderReceiverManualNativeLib} from "./OrderReceiverManualNativeLib.sol";

contract OrderReceiveManualNativeEstimatorFacet is IOrderReceiveManualNativeEstimator, Estimator {
    function estimateReceiveOrderAssetManualNative(
        Order calldata order_,
        bytes calldata toSignature_,
        bytes calldata toPostData_,
        address caller_
    ) external payable onlyEstimate {
        _estimateReceiveOrderAssetManualNative(order_, toSignature_, toPostData_, caller_, NativeLib.VALUE_ORIGINAL_BIT);
    }

    function estimateReceiveOrderAssetManualNative(
        Order calldata order_,
        bytes calldata toSignature_,
        bytes calldata toPostData_,
        address caller_,
        uint256 value_
    ) external payable onlyEstimate {
        _estimateReceiveOrderAssetManualNative(order_, toSignature_, toPostData_, caller_, value_);
    }

    function _estimateReceiveOrderAssetManualNative(
        Order calldata order_,
        bytes calldata toSignature_,
        bytes calldata toPostData_,
        address caller_,
        uint256 value_
    ) private {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (caller_ != order_.fromActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();
        if (order_.fromToken != NativeLib.NATIVE_ADDRESS) revert OrderReceiveNotNative();

        bytes32 orderHash = OrderHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        if (toSignature_.length != 0) SignatureLib.validateSignature(orderHash, toSignature_, order_.toActor);
        ManualNativeNonceLib.validatePostData(order_.nonce, toPostData_);

        OrderReceiverLib.store().collateralLocker.commitLock(order_.toActor, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        if (toPostData_.length == 0) NativeLib.transferFrom(caller_, order_.toActor, order_.fromAmount, value_);
        else {
            OrderReceiverManualNativeLib.store().activeOrderHash[order_.toActor] = orderHash;

            if (order_.nonce & ManualNativeNonceLib.POST_WITH_SEND_BIT != 0) {
                NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount, value_, toPostData_);
            } else {
                NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount, value_);

                (bool postSuccess, bytes memory postResult) = order_.toActor.call(toPostData_);
                if (order_.nonce & ManualNativeNonceLib.POST_ALLOW_FAIL_BIT == 0) Address.verifyCallResultFromTarget(order_.toActor, postSuccess, postResult);
            }

            delete OrderReceiverManualNativeLib.store().activeOrderHash[order_.toActor];
        }

        emit AssetReceive(orderHash);
    }
}
