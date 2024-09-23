// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IHashStorage} from "../../storage/interfaces/IHashStorage.sol";

contract HashStorageMock is IHashStorage {
    function hasHashStore(bytes32) external pure returns (bool) {
        return true;
    }
}
