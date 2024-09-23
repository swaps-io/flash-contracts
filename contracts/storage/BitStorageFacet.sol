// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IBitStorageFacet} from "./interfaces/IBitStorageFacet.sol";

import {BitStorageLib} from "./BitStorageLib.sol";

contract BitStorageFacet is IBitStorageFacet {
    function hasHashStore(bytes32 hash_) external view override returns (bool) {
        return BitStorageLib.hasBitStored(hash_);
    }
}
