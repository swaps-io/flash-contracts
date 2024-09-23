// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {EventHashLib} from "../../utils/EventHashLib.sol";

contract EventHashTest {
    function calcEventHash(bytes32 sig_, bytes32 arg_) external pure returns (bytes32) {
        return EventHashLib.calcEventHash(sig_, arg_);
    }
}
