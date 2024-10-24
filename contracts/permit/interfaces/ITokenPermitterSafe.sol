// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

interface ITokenPermitterSafe {
    function permitSafe(address from, address token, uint256 amount, bytes calldata signature) external;
}
