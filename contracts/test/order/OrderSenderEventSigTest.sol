// SPDX-License-Identifier: BUSL-1.1

// solhint-disable one-contract-per-file

pragma solidity 0.8.24;

import {OrderSenderLib} from "../../order/OrderSenderLib.sol";

abstract contract OrderAssetSendEventSigTest {
    error AssetSendEventSigMismatch(bytes32 hash, bytes32 expectedHash);

    bytes32 private constant ASSET_SEND_SIG = keccak256("AssetSend(bytes32)");

    function checkAssetSendEventSig() external pure {
        if (OrderSenderLib.ASSET_SEND_SIG != ASSET_SEND_SIG) {
            revert AssetSendEventSigMismatch(OrderSenderLib.ASSET_SEND_SIG, ASSET_SEND_SIG);
        }
    }
}

abstract contract OrderAssetLiqSendEventSigTest {
    error AssetLiqSendEventSigMismatch(bytes32 hash, bytes32 expectedHash);

    bytes32 private constant ASSET_LIQ_SEND_SIG = keccak256("AssetLiqSend(bytes32,bytes32,address)");

    function checkAssetLiqSendEventSig() external pure {
        if (OrderSenderLib.ASSET_LIQ_SEND_SIG != ASSET_LIQ_SEND_SIG) {
            revert AssetLiqSendEventSigMismatch(OrderSenderLib.ASSET_LIQ_SEND_SIG, ASSET_LIQ_SEND_SIG);
        }
    }
}

abstract contract OrderAssetNoSendEventSigTest {
    error AssetNoSendEventSigMismatch(bytes32 hash, bytes32 expectedHash);

    bytes32 private constant ASSET_NO_SEND_SIG = keccak256("AssetNoSend(bytes32,bytes32,address)");

    function checkAssetNoSendEventSig() external pure {
        if (OrderSenderLib.ASSET_NO_SEND_SIG != ASSET_NO_SEND_SIG) {
            revert AssetNoSendEventSigMismatch(OrderSenderLib.ASSET_NO_SEND_SIG, ASSET_NO_SEND_SIG);
        }
    }
}

// prettier-ignore
// solhint-disable-next-line no-empty-blocks
contract OrderSenderEventSigTest is
    OrderAssetSendEventSigTest,
    OrderAssetLiqSendEventSigTest,
    OrderAssetNoSendEventSigTest
{}
