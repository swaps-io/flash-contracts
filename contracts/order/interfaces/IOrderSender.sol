// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {Order} from "./Order.sol";

interface IOrderSenderErrors {
    error OrderSendExpired();
    error OrderLiqSendExpired();
    error OrderLiqSendUnreached();
    error OrderNoSendUnreached();
    error SendChainMismatch();
    error SendCallerMismatch();
    error OrderAlreadySent();
}

interface IOrderSenderEvents {
    event AssetSend(bytes32 indexed orderHash);
    event AssetLiqSend(bytes32 indexed orderActorHash, bytes32 orderHash, address liquidator);
    event AssetNoSend(bytes32 indexed orderActorHash, bytes32 orderHash, address reporter);
}

interface IOrderSenderViews {
    function orderAssetSent(bytes32 orderHash) external view returns (bool);

    function orderLiquidator(bytes32 orderHash) external view returns (address);
}

interface IOrderSender is IOrderSenderErrors, IOrderSenderEvents, IOrderSenderViews {
    function sendOrderAsset(Order calldata order) external;

    function sendOrderLiqAsset(Order calldata order) external;

    function reportOrderNoSend(Order calldata order) external;
}
