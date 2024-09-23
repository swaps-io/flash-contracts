// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {ICallEstimator} from "./interfaces/ICallEstimator.sol";

import {Estimator} from "./Estimator.sol";

contract CallEstimatorFacet is ICallEstimator, Estimator {
    function estimateCall(address to_, bytes calldata data_, uint256 value_) external onlyEstimate {
        Address.functionCallWithValue(to_, data_, value_);
    }
}
