// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderSenderErrors, IOrderSenderEvents, IOrderSenderNativeErrors, Order} from "./IOrderSenderNative.sol";

interface IOrderSendNativeEstimator is IEstimator, IOrderSenderNativeErrors, IOrderSenderErrors, IOrderSenderEvents {
    function estimateSendOrderAssetNative(Order calldata order, address caller) external payable;

    function estimateSendOrderAssetNative(Order calldata order, address caller, uint256 value) external payable;

    function estimateSendOrderLiqAssetNative(Order calldata order, address caller) external payable;

    function estimateSendOrderLiqAssetNative(Order calldata order, address caller, uint256 value) external payable;
}
