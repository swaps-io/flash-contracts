// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

struct OrderReceiverManualNativeStorage {
    mapping(address toActor => bytes32) activeOrderHash;
}
