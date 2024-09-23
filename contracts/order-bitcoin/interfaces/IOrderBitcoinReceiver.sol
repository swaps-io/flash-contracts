// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralLocker} from "../../collateral/interfaces/ICollateralLocker.sol";

import {IOrderReceiverErrors, IOrderReceiverEvents} from "../../order/interfaces/IOrderReceiver.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinReceiverViews {
    function bitcoinReceiverCollateralLocker() external view returns (ICollateralLocker);
}

interface IOrderBitcoinReceiver is IOrderBitcoinReceiverViews, IOrderReceiverErrors, IOrderReceiverEvents {
    function receiveOrderBitcoinAsset(OrderBitcoin calldata order, bytes calldata fromSignature) external;
}
