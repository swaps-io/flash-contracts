// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

import {Order} from "../../order/interfaces/Order.sol";

interface IAdapterOrderResolver is IERC1271 {
    /// @notice Resolver must validate the call is from approved adapter contract
    function receiveAdapterOrderAsset(Order calldata order) external;
}
