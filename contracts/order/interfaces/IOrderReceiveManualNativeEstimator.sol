// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "../../utils/interfaces/IEstimator.sol";

import {IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents, Order} from "./IOrderReceiverManualNative.sol";

interface IOrderReceiveManualNativeEstimator is IEstimator, IOrderReceiverManualNativeErrors, IOrderReceiverErrors, IOrderReceiverEvents {
    function estimateReceiveOrderAssetManualNative(
        Order calldata order,
        bytes calldata toSignature,
        bytes calldata toPostData,
        address caller
    ) external payable;

    function estimateReceiveOrderAssetManualNative(
        Order calldata order,
        bytes calldata toSignature,
        bytes calldata toPostData,
        address caller,
        uint256 value
    ) external payable;
}
