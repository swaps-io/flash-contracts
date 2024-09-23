// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

interface ICollateralUnlocker {
    function approveUnlock(address account, uint256 amount, uint256 lockChain) external;

    function rejectUnlock(address account, uint256 amount, uint256 lockChain, address receiver) external;
}
