// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {OrderResolverStorage} from "./interfaces/OrderResolverStorage.sol";

library OrderResolverLib {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderResolverLib")
    bytes32 private constant STORAGE_SLOT = 0x93c089dec1346f3c9d111f6974d7849e6029bef026e900d74d94361b46efcbf1;

    function store() internal pure returns (OrderResolverStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }

    function orderResolved(bytes32 orderHash_) internal view returns (bool) {
        return BitStorageLib.hasBitStored(orderHash_);
    }
}
