// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

struct BitStorage {
    mapping(bytes32 key => uint256) value;
}
