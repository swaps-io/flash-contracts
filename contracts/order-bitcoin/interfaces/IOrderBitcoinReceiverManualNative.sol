// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents} from "../../order/interfaces/IOrderReceiverManualNative.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinReceiverManualNative is IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents {
    function receiveOrderBitcoinAssetManualNative(OrderBitcoin calldata order, bytes calldata toSignature) external payable;
}
