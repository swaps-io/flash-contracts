// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralLocker} from "../../collateral/interfaces/ICollateralLocker.sol";

contract CollateralLockerMock is ICollateralLocker {
    error LockRefusal();

    mapping(address account => mapping(uint256 unlockChain => uint256)) public lockCounter;
    mapping(address account => mapping(uint256 unlockChain => uint256)) public externalUnlockCounter;

    function setLockCounter(address account_, uint256 unlockChain_, uint256 lockCounter_) external {
        lockCounter[account_][unlockChain_] = lockCounter_;
    }

    function setExternalUnlockCounter(address account_, uint256 unlockChain_, uint256 unlockCounter_) external {
        externalUnlockCounter[account_][unlockChain_] = unlockCounter_;
    }

    function commitLock(address account_, uint256 amount_, uint256 unlockChain_, uint256 unlockCounter_) external {
        uint256 lockCount = lockCounter[account_][unlockChain_] + amount_;
        if (lockCount > unlockCounter_) revert LockRefusal();
        lockCounter[account_][unlockChain_] = lockCount;
    }

    function cancelLock(address account_, uint256 amount_, uint256 unlockChain_) external {
        lockCounter[account_][unlockChain_] -= amount_;
    }
}
