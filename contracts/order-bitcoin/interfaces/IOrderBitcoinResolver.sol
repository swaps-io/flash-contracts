// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralUnlocker} from "../../collateral/interfaces/ICollateralUnlocker.sol";

import {IProofVerifier} from "../../proof/interfaces/IProofVerifier.sol";

import {IOrderResolverErrors, IOrderResolverEvents} from "../../order/interfaces/IOrderResolver.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";

interface IOrderBitcoinResolverViews {
    function bitcoinResolverCollateralUnlocker() external view returns (ICollateralUnlocker);

    function bitcoinResolverProofVerifier() external view returns (IProofVerifier);
}

interface IOrderBitcoinResolver is IOrderBitcoinResolverViews, IOrderResolverErrors, IOrderResolverEvents {
    function confirmOrderBitcoinAssetSend(OrderBitcoin calldata order, bytes calldata receiveProof, bytes calldata sendProof) external;

    function slashOrderBitcoinLiqCollateral(OrderBitcoin calldata order, address liquidator, bytes calldata receiveProof, bytes calldata liqSendProof) external;

    function slashOrderBitcoinCollateral(OrderBitcoin calldata order, address reporter, bytes calldata receiveProof, bytes calldata noSendProof) external;
}
