// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {OrderBitcoinReserverLib} from "../../order-bitcoin/OrderBitcoinReserverLib.sol";

abstract contract OrderAssetNoReceiveEventSigTest {
    error AssetNoReceiveEventSigMismatch(bytes32 hash, bytes32 expectedHash);

    bytes32 private constant ASSET_NO_RECEIVE_SIG = keccak256("AssetNoReceive(bytes32)");

    function checkAssetNoReceiveEventSig() external pure {
        if (OrderBitcoinReserverLib.ASSET_NO_RECEIVE_SIG != ASSET_NO_RECEIVE_SIG) {
            revert AssetNoReceiveEventSigMismatch(OrderBitcoinReserverLib.ASSET_NO_RECEIVE_SIG, ASSET_NO_RECEIVE_SIG);
        }
    }
}

// prettier-ignore
// solhint-disable-next-line no-empty-blocks
contract OrderBitcoinReserverEventSigTest is
    OrderAssetNoReceiveEventSigTest
{}
