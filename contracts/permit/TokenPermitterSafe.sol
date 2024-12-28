// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ITokenPermitterSafe} from "./interfaces/ITokenPermitterSafe.sol";
import {IGnosisSafe} from "./interfaces/IGnosisSafe.sol";

abstract contract TokenPermitterSafe is ITokenPermitterSafe {
    function permitSafe(address from_, address token_, uint256 amount_, bytes calldata signature_) external {
        bytes memory data = abi.encodeCall(IERC20.approve, (address(this), amount_));
        IGnosisSafe(from_).execTransaction(token_, 0, data, IGnosisSafe.Operation.Call, 0, 0, 0, address(0), payable(0), signature_);
    }
}
