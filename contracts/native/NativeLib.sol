// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC20Native} from "./interfaces/IERC20Native.sol";
import {NativeTokenLib} from "./NativeTokenLib.sol";

library NativeLib {
    using SafeERC20 for IERC20Native;

    address internal constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint256 internal constant VALUE_ORIGINAL_BIT = 1 << 255;
    uint256 internal constant VALUE_SKIP_SEND_BIT = 1 << 254;

    function transferFrom(address sender_, address receiver_, uint256 amount_) internal {
        _transferFrom(sender_, receiver_, amount_, msg.value);
    }

    function transferFrom(address sender_, address receiver_, uint256 amount_, uint256 value_) internal {
        if (value_ & VALUE_ORIGINAL_BIT != 0) _transferFrom(sender_, receiver_, amount_, msg.value);
        else if (value_ & VALUE_SKIP_SEND_BIT == 0) _transferFrom(sender_, receiver_, amount_, value_);
    }

    function _transferFrom(address sender_, address receiver_, uint256 amount_, uint256 value_) private {
        if (value_ < amount_) {
            uint256 nativeTokenAmount = amount_ - value_;
            IERC20Native nativeToken = NativeTokenLib.store().nativeToken;
            nativeToken.safeTransferFrom(sender_, address(this), nativeTokenAmount);
            nativeToken.withdraw(nativeTokenAmount);
        } else if (value_ > amount_) {
            Address.sendValue(payable(sender_), value_ - amount_); // Refund excessive value
        }
        Address.sendValue(payable(receiver_), amount_);
    }
}
