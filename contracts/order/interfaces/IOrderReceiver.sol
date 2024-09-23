// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {ICollateralLocker} from "../../collateral/interfaces/ICollateralLocker.sol";

import {Order} from "./Order.sol";

interface IOrderReceiverErrors {
    error OrderReceiveExpired();
    error ReceiveChainMismatch();
    error ReceiveCallerMismatch();
    error OrderAlreadyReceived();
}

interface IOrderReceiverEvents {
    event AssetReceive(bytes32 indexed orderHash);
}

interface IOrderReceiverViews {
    function orderAssetReceived(bytes32 orderHash) external view returns (bool);

    function receiverCollateralLocker() external view returns (ICollateralLocker);
}

interface IOrderReceiver is IOrderReceiverErrors, IOrderReceiverEvents, IOrderReceiverViews {
    function receiveOrderAsset(Order calldata order, bytes calldata fromSignature) external;
}
