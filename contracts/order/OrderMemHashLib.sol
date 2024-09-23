// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderHashLib, DomainLib, Order} from "./OrderHashLib.sol";

library OrderMemHashLib {
    function calcOrderHash(Order memory order_) internal pure returns (bytes32) {
        return DomainLib.calcDomainHash(keccak256(abi.encode(OrderHashLib.ORDER_TYPE_HASH, order_)));
    }
}
