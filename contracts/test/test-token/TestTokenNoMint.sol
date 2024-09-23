// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {TestToken} from "./TestToken.sol";

abstract contract TestTokenNoMint is TestToken {
    error MintNotSupported();

    function mint(address, uint256) external pure override {
        revert MintNotSupported();
    }
}
