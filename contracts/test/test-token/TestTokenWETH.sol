// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {IERC20Native} from "../../native/interfaces/IERC20Native.sol";

import {TestTokenNoMint, TestToken} from "./TestTokenNoMint.sol";

contract TestTokenWETH is TestTokenNoMint, IERC20Native {
    constructor() TestToken("WETH Test", "WETHT", 18) {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount_) external {
        _burn(msg.sender, amount_);
        Address.sendValue(payable(msg.sender), amount_);
    }
}
