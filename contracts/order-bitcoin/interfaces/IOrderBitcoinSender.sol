// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IOrderSenderErrors, IOrderSenderEvents} from "../../order/interfaces/IOrderSender.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinSender is IOrderSenderErrors, IOrderSenderEvents {
    function sendOrderBitcoinAsset(OrderBitcoin calldata order) external;

    function sendOrderBitcoinLiqAsset(OrderBitcoin calldata order) external;

    function reportOrderBitcoinNoSend(OrderBitcoin calldata order) external;
}
