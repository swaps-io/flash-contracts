// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC20Native} from "../native/interfaces/IERC20Native.sol";
import {NativeTokenLib} from "../native/NativeTokenLib.sol";

library OrderSenderNativeLib {
    using SafeERC20 for IERC20Native;

    uint256 internal constant VALUE_ORIGINAL_BIT = 1 << 255;
    uint256 internal constant VALUE_SKIP_BIT = 1 << 254;

    function sendOrderAsset(address fromActor_, address toActor_, uint256 toAmount_) internal {
        _sendOrderAsset(fromActor_, toActor_, toAmount_, msg.value);
    }

    function sendOrderAsset(address fromActor_, address toActor_, uint256 toAmount_, uint256 value_) internal {
        if (value_ & VALUE_ORIGINAL_BIT != 0) {
            _sendOrderAsset(fromActor_, toActor_, toAmount_, msg.value);
        } else if (value_ & VALUE_SKIP_BIT == 0) {
            _sendOrderAsset(fromActor_, toActor_, toAmount_, value_);
        }
    }

    function _sendOrderAsset(address fromActor_, address toActor_, uint256 toAmount_, uint256 toValue_) private {
        if (toValue_ < toAmount_) {
            uint256 nativeTokenAmount = toAmount_ - toValue_;
            IERC20Native nativeToken = NativeTokenLib.store().nativeToken;
            nativeToken.safeTransferFrom(toActor_, address(this), nativeTokenAmount);
            nativeToken.withdraw(nativeTokenAmount);
        } else if (toValue_ > toAmount_) {
            Address.sendValue(payable(toActor_), toValue_ - toAmount_); // Refund excessive value
        }
        Address.sendValue(payable(fromActor_), toAmount_);
    }
}
