// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Order} from "./Order.sol";

import {IOrderSenderErrors, IOrderSenderEvents} from "./IOrderSender.sol";

interface IOrderSenderNativeErrors {
    error OrderSendNotNative();
}

interface IOrderSenderNative is IOrderSenderNativeErrors, IOrderSenderErrors, IOrderSenderEvents {
    function sendOrderAssetNative(Order calldata order) external;

    function sendOrderLiqAssetNative(Order calldata order) external;
}
