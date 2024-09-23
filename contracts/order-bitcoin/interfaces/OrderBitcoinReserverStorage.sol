// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralLocker} from "../../collateral/interfaces/ICollateralLocker.sol";

import {IProofVerifier} from "../../proof/interfaces/IProofVerifier.sol";

import {BitcoinCollateralState} from "./BitcoinCollateralState.sol";

struct OrderBitcoinReserverStorage {
    ICollateralLocker collateralLocker;
    IProofVerifier proofVerifier;
    mapping(bytes32 orderHash => BitcoinCollateralState) collateralState;
    mapping(string bitcoinAddress => bytes32) bitcoinAddressUsedOrder;
}
