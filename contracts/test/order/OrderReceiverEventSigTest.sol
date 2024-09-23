// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {OrderReceiverLib} from "../../order/OrderReceiverLib.sol";

abstract contract OrderAssetReceiveEventSigTest {
    error AssetReceiveEventSigMismatch(bytes32 hash, bytes32 expectedHash);

    bytes32 private constant ASSET_RECEIVE_SIG = keccak256("AssetReceive(bytes32)");

    function checkAssetReceiveEventSig() external pure {
        if (OrderReceiverLib.ASSET_RECEIVE_SIG != ASSET_RECEIVE_SIG) {
            revert AssetReceiveEventSigMismatch(OrderReceiverLib.ASSET_RECEIVE_SIG, ASSET_RECEIVE_SIG);
        }
    }
}

// prettier-ignore
// solhint-disable-next-line no-empty-blocks
contract OrderReceiverEventSigTest is
    OrderAssetReceiveEventSigTest
{}
