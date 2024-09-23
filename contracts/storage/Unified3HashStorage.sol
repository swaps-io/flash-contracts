// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IHashStorage} from "./interfaces/IHashStorage.sol";

contract Unified3HashStorage is IHashStorage {
    IHashStorage public immutable STORAGE_0;
    IHashStorage public immutable STORAGE_1;
    IHashStorage public immutable STORAGE_2;

    constructor(address storage0_, address storage1_, address storage2_) {
        STORAGE_0 = IHashStorage(storage0_);
        STORAGE_1 = IHashStorage(storage1_);
        STORAGE_2 = IHashStorage(storage2_);
    }

    function hasHashStore(bytes32 hash_) public view returns (bool) {
        return STORAGE_0.hasHashStore(hash_) || STORAGE_1.hasHashStore(hash_) || STORAGE_2.hasHashStore(hash_);
    }
}
