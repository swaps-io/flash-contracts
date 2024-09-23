// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralLocker} from "../../collateral/interfaces/ICollateralLocker.sol";

import {IProofVerifier} from "../../proof/interfaces/IProofVerifier.sol";

import {OrderBitcoin} from "./OrderBitcoin.sol";
import {BitcoinCollateralState} from "./BitcoinCollateralState.sol";

interface IOrderBitcoinReserverErrors {
    error BitcoinLockExpired();
    error BitcoinLockChainMismatch();
    error BitcoinLockerMismatch();
    error BitcoinLockRefusal();
    error BitcoinAddressUsed(string bitcoinAddress, bytes32 orderHashUsed);
    error BitcoinUnlockRefusal();
}

interface IOrderBitcoinReserverEvents {
    event BitcoinCollateralLock(bytes32 orderHash);
    event BitcoinCollateralUnlock(bytes32 orderHash);
}

interface IOrderBitcoinReserverViews {
    function orderBitcoinCollateralState(bytes32 orderHash) external view returns (BitcoinCollateralState);

    function bitcoinAddressUsedOrder(string calldata bitcoinAddress) external view returns (bytes32);

    function bitcoinReserverCollateralLocker() external view returns (ICollateralLocker);

    function bitcoinReserverProofVerifier() external view returns (IProofVerifier);
}

interface IOrderBitcoinReserver is IOrderBitcoinReserverErrors, IOrderBitcoinReserverEvents, IOrderBitcoinReserverViews {
    function lockOrderBitcoinCollateral(OrderBitcoin calldata order, bytes calldata fromSignature) external;

    function unlockOrderBitcoinCollateral(OrderBitcoin calldata order, bytes calldata noReceiveProof) external;
}
