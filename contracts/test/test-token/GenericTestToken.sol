// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {TestToken} from "./TestToken.sol";

contract GenericTestToken is TestToken {
    constructor() TestToken("Generic Test", "GENT", 6) {}
}
