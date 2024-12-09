// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {OrderReceiverLib} from "../order/OrderReceiverLib.sol";
import {ManualNativeNonceLib} from "../order/ManualNativeNonceLib.sol";
import {OrderReceiverManualNativeLib} from "../order/OrderReceiverManualNativeLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {IOrderBitcoinReceiverManualNative} from "./interfaces/IOrderBitcoinReceiverManualNative.sol";

import {OrderBitcoinReceiverLib} from "./OrderBitcoinReceiverLib.sol";
import {OrderBitcoinHashLib, OrderBitcoin} from "./OrderBitcoinHashLib.sol";

contract OrderBitcoinReceiverManualNativeFacet is IOrderBitcoinReceiverManualNative {
    function receiveOrderBitcoinAssetManualNative(OrderBitcoin calldata order_, bytes calldata toSignature_, bytes calldata toPostData_) external payable {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (msg.sender != order_.fromActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();
        if (order_.fromToken != NativeLib.NATIVE_ADDRESS) revert OrderReceiveNotNative();

        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        SignatureLib.validateSignature(orderHash, toSignature_, order_.toActor);
        ManualNativeNonceLib.validatePostData(order_.nonce, toPostData_);

        OrderBitcoinReceiverLib.store().collateralLocker.commitLock(order_.toActor, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        if (toPostData_.length == 0) NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount);
        else {
            OrderReceiverManualNativeLib.store().activeOrderHash[order_.toActor] = orderHash;

            if (order_.nonce & ManualNativeNonceLib.POST_WITH_SEND_BIT != 0) {
                NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount, toPostData_);
            } else {
                NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount);

                (bool postSuccess, bytes memory postResult) = order_.toActor.call(toPostData_);
                if (order_.nonce & ManualNativeNonceLib.POST_ALLOW_FAIL_BIT == 0) Address.verifyCallResultFromTarget(order_.toActor, postSuccess, postResult);
            }

            delete OrderReceiverManualNativeLib.store().activeOrderHash[order_.toActor];
        }

        emit AssetReceive(orderHash);
    }
}
