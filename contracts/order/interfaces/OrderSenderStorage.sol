// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

struct OrderSenderStorage {
    mapping(bytes32 orderHash => address) orderLiquidator;
}
