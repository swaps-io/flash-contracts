// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {NativeTokenStorage} from "./interfaces/NativeTokenStorage.sol";

library NativeTokenLib {
    // keccak256("com.swaps-io.flash.diamond.storage.NativeTokenLib")
    bytes32 private constant STORAGE_SLOT = 0x337b0609cdcd3f64f491b69277bc0ab4cdb825d137e964d0fe33c6c6f2cef5f2;

    function store() internal pure returns (NativeTokenStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }
}
