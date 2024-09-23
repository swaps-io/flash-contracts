// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

interface ICollateralLockerViews {
    function externalUnlockCounter(address account, uint256 unlockChain) external view returns (uint256);
}

interface ICollateralLocker is ICollateralLockerViews {
    function commitLock(address account, uint256 amount, uint256 unlockChain, uint256 unlockCounter) external;

    function cancelLock(address account, uint256 amount, uint256 unlockChain) external;
}
