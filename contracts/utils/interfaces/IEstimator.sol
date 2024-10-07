// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

interface IEstimatorErrors {
    error InvalidEstimateCaller();
}

interface IEstimator is IEstimatorErrors {}
