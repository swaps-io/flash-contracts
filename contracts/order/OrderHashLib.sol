// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {DomainLib} from "../domain/DomainLib.sol";

import {Order} from "./interfaces/Order.sol";

library OrderHashLib {
    // Typed data hash of "Order" structure type
    bytes32 internal constant ORDER_TYPE_HASH = 0x5b26493e316425594d29f03df55bfaa7f88f8cc3bef9b034d32e0a6806bffc4d;

    function calcOrderHash(Order calldata order_) internal pure returns (bytes32) {
        return DomainLib.calcDomainHash(keccak256(abi.encode(ORDER_TYPE_HASH, order_)));
    }
}
