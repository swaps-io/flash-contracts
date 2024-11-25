// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IOrderReceiverErrors, IOrderReceiverEvents} from "./IOrderReceiver.sol";
import {Order} from "./Order.sol";

interface IOrderReceiverManualNativeErrors {
    error OrderReceiveNotNative();
}

interface IOrderReceiverManualNative is IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents {
    function receiveOrderAssetManualNative(Order calldata order, bytes calldata toSignature) external payable;
}
