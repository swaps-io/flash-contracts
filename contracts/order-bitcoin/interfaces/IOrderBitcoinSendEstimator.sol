// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderSenderErrors, IOrderSenderEvents} from "../../order/interfaces/IOrderSender.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinSendEstimator is IEstimator, IOrderSenderErrors, IOrderSenderEvents {
    function estimateSendOrderBitcoinAsset(OrderBitcoin calldata order, address caller) external;

    function estimateSendOrderBitcoinLiqAsset(OrderBitcoin calldata order, address caller) external;

    function estimateReportOrderBitcoinNoSend(OrderBitcoin calldata order, address caller) external;
}
