// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC20Native} from "../native/interfaces/IERC20Native.sol";
import {NativeTokenLib} from "../native/NativeTokenLib.sol";

library OrderSenderNativeLib {
    using SafeERC20 for IERC20Native;

    address internal constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function sendOrderAsset(address fromActor_, uint256 toAmount_) internal {
        IERC20Native nativeToken = NativeTokenLib.store().nativeToken;
        nativeToken.safeTransferFrom(msg.sender, address(this), toAmount_);
        nativeToken.withdraw(toAmount_);
        Address.sendValue(payable(fromActor_), toAmount_);
    }
}
