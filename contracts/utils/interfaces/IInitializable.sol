// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {InitializableStorage} from "./InitializableStorage.sol";

interface IInitializableErrors {
    error InvalidInitialization();
}

interface IInitializable is IInitializableErrors {}
