// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralUnlocker} from "../../collateral/interfaces/ICollateralUnlocker.sol";

import {IProofVerifier} from "../../proof/interfaces/IProofVerifier.sol";

struct OrderBitcoinResolverStorage {
    ICollateralUnlocker collateralUnlocker;
    IProofVerifier proofVerifier;
}
