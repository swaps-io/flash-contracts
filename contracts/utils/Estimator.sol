// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "./interfaces/IEstimator.sol";

abstract contract Estimator is IEstimator {
    modifier onlyEstimate() {
        // Wraps method that's for gas estimate purposes only. The `from` transaction param must be set to `0x00..00`
        // for a successful estimate, making it impossible to submit a real transaction on-chain using this method.
        // Due to the enforced `from` param value, code of the estimate function must not rely on `msg.sender` usage
        if (tx.origin != address(0)) revert InvalidEstimateCaller();
        _;
    }
}
