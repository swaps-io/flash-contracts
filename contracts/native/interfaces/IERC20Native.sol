// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Native is IERC20 {
    function withdraw(uint256 amount) external;
}
