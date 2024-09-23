// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderBitcoinResolverStorage} from "./interfaces/OrderBitcoinResolverStorage.sol";

library OrderBitcoinResolverLib {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderBitcoinResolverLib")
    bytes32 private constant STORAGE_SLOT = 0x4fad9b7f78d6c2e89342c5e126073303c44ab311d9623cbb142039e70728a281;

    function store() internal pure returns (OrderBitcoinResolverStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }
}
