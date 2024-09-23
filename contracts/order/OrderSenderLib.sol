// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {OrderSenderStorage} from "./interfaces/OrderSenderStorage.sol";

library OrderSenderLib {
    using SafeERC20 for IERC20;

    // keccak256("AssetSend(bytes32)")
    bytes32 internal constant ASSET_SEND_SIG = 0x23164bf06272e7181c46edaa1489d6e021bab6e2ee7972b9662b467774dc4957;

    // keccak256("AssetLiqSend(bytes32,bytes32,address)")
    bytes32 internal constant ASSET_LIQ_SEND_SIG = 0x0fdf769718ccde7039b125c66feb571317671aa8e3dd1b6e603524c6ff574b99;

    // keccak256("AssetNoSend(bytes32,bytes32,address)")
    bytes32 internal constant ASSET_NO_SEND_SIG = 0x58b111093479007a38863f2f87d8df8a23cd5d7bcc55b0d2aafc0a30c68f6b2f;

    // keccak256("com.swaps-io.flash.diamond.storage.OrderSenderLib")
    bytes32 private constant STORAGE_SLOT = 0x0c6a86935de64f6364c5e72882bf309a89de645e945d28c0f8534d69773038ca;

    function store() internal pure returns (OrderSenderStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }

    function orderAssetSent(bytes32 orderHash_, bytes32 orderSendEventHash_) internal view returns (bool) {
        return BitStorageLib.hasBitStored(orderSendEventHash_) || store().orderLiquidator[orderHash_] != address(0);
    }

    function sendOrderAsset(address toToken_, address fromActor_, uint256 toAmount_) internal {
        IERC20(toToken_).safeTransferFrom(msg.sender, fromActor_, toAmount_);
    }
}
