// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderBitcoinReceiverStorage} from "./interfaces/OrderBitcoinReceiverStorage.sol";

library OrderBitcoinReceiverLib {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderBitcoinReceiverLib")
    bytes32 private constant STORAGE_SLOT = 0x87f39ff54ecb920bfca73a23e88b6ba8a5a1796b3669fda256411095324735ba;

    function store() internal pure returns (OrderBitcoinReceiverStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }
}
