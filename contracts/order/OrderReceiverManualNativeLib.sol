// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderReceiverManualNativeStorage} from "./interfaces/OrderReceiverManualNativeStorage.sol";

library OrderReceiverManualNativeLib {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderReceiverManualNativeLib")
    bytes32 private constant STORAGE_SLOT = 0x41e920b0811adecf39a5e7195128248e4d371314e929cecde761115a68cca65f;

    function store() internal pure returns (OrderReceiverManualNativeStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }
}
