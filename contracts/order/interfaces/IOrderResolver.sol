// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {ICollateralUnlocker} from "../../collateral/interfaces/ICollateralUnlocker.sol";

import {IProofVerifier} from "../../proof/interfaces/IProofVerifier.sol";

import {Order} from "./Order.sol";

interface IOrderResolverErrors {
    error CollateralChainMismatch();
    error OrderAlreadyResolved();
}

interface IOrderResolverEvents {
    event OrderSendConfirm(bytes32 orderHash);
    event OrderCollateralSlash(bytes32 orderHash);
}

interface IOrderResolverViews {
    function orderResolved(bytes32 orderHash) external view returns (bool);

    function resolverCollateralUnlocker() external view returns (ICollateralUnlocker);

    function resolverProofVerifier() external view returns (IProofVerifier);
}

interface IOrderResolver is IOrderResolverErrors, IOrderResolverEvents, IOrderResolverViews {
    function confirmOrderAssetSend(Order calldata order, bytes calldata receiveProof, bytes calldata sendProof) external;

    function slashOrderLiqCollateral(Order calldata order, address liquidator, bytes calldata receiveProof, bytes calldata liqSendProof) external;

    function slashOrderCollateral(Order calldata order, address reporter, bytes calldata receiveProof, bytes calldata noSendProof) external;
}
