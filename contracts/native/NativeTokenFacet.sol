// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Initializable} from "../utils/Initializable.sol";

import {NativeTokenLib} from "./NativeTokenLib.sol";

import {INativeTokenFacet, IERC20Native} from "./interfaces/INativeTokenFacet.sol";

contract NativeTokenFacet is INativeTokenFacet, Initializable {
    // keccak256("com.swaps-io.flash.diamond.storage.NativeTokenFacet.Initializable")
    bytes32 private constant INITIALIZER_STORAGE_SLOT = 0x7c5ae8b5619da04b92d56f3e00fbadd624df354c550ff7cda188db92de1fab29;

    function initializeNativeTokenFacet(address nativeToken_) external initializer(INITIALIZER_STORAGE_SLOT) {
        if (nativeToken_ == address(0)) revert ZeroNativeToken();
        NativeTokenLib.store().nativeToken = IERC20Native(nativeToken_);
    }

    // prettier-ignore
    function nativeToken() external view returns (IERC20Native) { return NativeTokenLib.store().nativeToken; }
}
