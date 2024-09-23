// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {CollateralLockerMock} from "./CollateralLockerMock.sol";
import {CollateralUnlockerMock} from "./CollateralUnlockerMock.sol";

contract CollateralManagerMock is CollateralLockerMock, CollateralUnlockerMock {
    constructor(address token_) CollateralUnlockerMock(token_) {}
}
