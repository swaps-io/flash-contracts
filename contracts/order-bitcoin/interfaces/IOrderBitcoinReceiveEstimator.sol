// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderReceiverErrors, IOrderReceiverEvents} from "../../order/interfaces/IOrderReceiver.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinReceiveEstimator is IEstimator, IOrderReceiverErrors, IOrderReceiverEvents {
    function estimateReceiveOrderBitcoinAsset(OrderBitcoin calldata order, bytes calldata fromSignature, address caller) external;
}
