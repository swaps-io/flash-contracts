// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICollateralUnlocker} from "../../collateral/interfaces/ICollateralUnlocker.sol";

contract CollateralUnlockerMock is ICollateralUnlocker {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    mapping(address account => mapping(uint256 lockChain => uint256)) public balance;
    mapping(address account => mapping(uint256 lockChain => uint256)) public unlockCounter;

    constructor(address token_) {
        token = IERC20(token_);
    }

    function deposit(address account_, uint256 amount_, uint256 lockChain_) external {
        token.safeTransferFrom(msg.sender, address(this), amount_);
        balance[account_][lockChain_] += amount_;
    }

    function approveUnlock(address account_, uint256 amount_, uint256 lockChain_) external {
        unlockCounter[account_][lockChain_] += amount_;
    }

    function rejectUnlock(address account_, uint256 amount_, uint256 lockChain_, address receiver_) external {
        balance[account_][lockChain_] -= amount_;
        token.safeTransfer(receiver_, amount_);
    }
}
