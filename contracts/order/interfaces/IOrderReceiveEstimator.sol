// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderReceiverErrors, IOrderReceiverEvents, Order} from "./IOrderReceiver.sol";

interface IOrderReceiveEstimator is IEstimator, IOrderReceiverErrors, IOrderReceiverEvents {
    function estimateReceiveOrderAsset(Order calldata order, bytes calldata fromSignature, address caller) external;
}
