// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderBitcoin} from "./OrderBitcoin.sol";

import {IOrderSenderNativeErrors} from "../../order/interfaces/IOrderSenderNative.sol";

import {IOrderSenderErrors, IOrderSenderEvents} from "../../order/interfaces/IOrderSender.sol";

interface IOrderBitcoinSenderNative is IOrderSenderNativeErrors, IOrderSenderErrors, IOrderSenderEvents {
    function sendOrderBitcoinAssetNative(OrderBitcoin calldata order) external;

    function sendOrderBitcoinLiqAssetNative(OrderBitcoin calldata order) external;
}
