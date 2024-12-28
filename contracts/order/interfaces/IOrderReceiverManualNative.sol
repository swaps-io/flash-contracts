// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.24;

import {IOrderReceiverErrors, IOrderReceiverEvents} from "./IOrderReceiver.sol";
import {Order} from "./Order.sol";

interface IOrderReceiverManualNativeErrors {
    error OrderReceiveNotNative();
}

interface IOrderReceiverManualNativeViews {
    function receiveOrderAssetManualNativeActive(address toActor) external view returns (bytes32 orderHash);
}

interface IOrderReceiverManualNative is IOrderReceiverManualNativeErrors, IOrderReceiverManualNativeViews, IOrderReceiverErrors, IOrderReceiverEvents {
    function receiveOrderAssetManualNative(Order calldata order, bytes calldata toSignature, bytes calldata toPostData) external payable;
}
