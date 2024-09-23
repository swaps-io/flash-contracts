// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderBitcoinReserverStorage} from "./interfaces/OrderBitcoinReserverStorage.sol";

library OrderBitcoinReserverLib {
    // keccak256("AssetNoReceive(bytes32)")
    bytes32 internal constant ASSET_NO_RECEIVE_SIG = 0x9a8bf9c94cdb3045149cf21a967b744531076db93c5aac98e03901db190b5eab;

    // keccak256("com.swaps-io.flash.diamond.storage.OrderBitcoinReserverLib")
    bytes32 private constant STORAGE_SLOT = 0x40ccfeca7c7360001a663582fe77cdd21009cbcfb89403e037bcb21c5dfab0c5;

    function store() internal pure returns (OrderBitcoinReserverStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }
}
