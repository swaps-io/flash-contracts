// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderSenderNativeErrors} from "../../order/interfaces/IOrderSenderNative.sol";
import {IOrderSenderErrors, IOrderSenderEvents} from "../../order/interfaces/IOrderSender.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinSendNativeEstimator is IEstimator, IOrderSenderNativeErrors, IOrderSenderErrors, IOrderSenderEvents {
    function estimateSendOrderBitcoinAssetNative(OrderBitcoin calldata order, address caller) external;

    function estimateSendOrderBitcoinLiqAssetNative(OrderBitcoin calldata order, address caller) external;
}
