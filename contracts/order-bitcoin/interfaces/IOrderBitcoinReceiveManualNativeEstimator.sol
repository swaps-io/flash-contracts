// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents, OrderBitcoin} from "./IOrderBitcoinReceiverManualNative.sol";

interface IOrderBitcoinReceiveManualNativeEstimator is IEstimator, IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents {
    function estimateReceiveOrderBitcoinAssetManualNative(
        OrderBitcoin calldata order,
        bytes calldata toSignature,
        bytes calldata toPostData,
        address caller
    ) external payable;

    function estimateReceiveOrderBitcoinAssetManualNative(
        OrderBitcoin calldata order,
        bytes calldata toSignature,
        bytes calldata toPostData,
        address caller,
        uint256 value
    ) external payable;
}
