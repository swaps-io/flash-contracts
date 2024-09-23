// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderSenderErrors, IOrderSenderEvents, Order} from "./IOrderSender.sol";

interface IOrderSendEstimator is IEstimator, IOrderSenderErrors, IOrderSenderEvents {
    function estimateSendOrderAsset(Order calldata order, address caller) external;

    function estimateSendOrderLiqAsset(Order calldata order, address caller) external;

    function estimateReportOrderNoSend(Order calldata order, address caller) external;
}
