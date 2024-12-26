// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract ProxyCallTest {
    receive() external payable {}

    function call(address target_, bytes calldata data_, uint256 value_) external {
        Address.functionCallWithValue(target_, data_, value_);
    }
}
