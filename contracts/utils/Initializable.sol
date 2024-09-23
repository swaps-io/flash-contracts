// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IInitializable, InitializableStorage} from "./interfaces/IInitializable.sol";

abstract contract Initializable is IInitializable {
    modifier initializer(bytes32 storageSlot_) {
        InitializableStorage storage s;
        assembly { s.slot := storageSlot_ } // prettier-ignore

        if (s.initialized) revert InvalidInitialization();
        s.initialized = true;

        _;
    }
}
