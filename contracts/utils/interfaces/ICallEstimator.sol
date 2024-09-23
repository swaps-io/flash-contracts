// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IEstimator} from "./IEstimator.sol";

interface ICallEstimator is IEstimator {
    function estimateCall(address to, bytes calldata data, uint256 value) external;
}
