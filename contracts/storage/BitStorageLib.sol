// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorage} from "./interfaces/BitStorage.sol";

library BitStorageLib {
    // keccak256("com.swaps-io.flash.diamond.storage.BitStorageLib")
    bytes32 private constant STORAGE_SLOT = 0xd7e6a87efd0a7da6154e9459151089509a18a94a6a4072527f9ec5d1eaed4f28;

    function store() internal pure returns (BitStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }

    function hasBitStored(bytes32 key_) internal view returns (bool) {
        return store().value[key_] != 0;
    }

    function hasBitStoredAt(bytes32 key_, uint8 index_) internal view returns (bool) {
        return (store().value[key_] & (1 << index_)) != 0;
    }

    function storedBitsCount(bytes32 key_) internal view returns (uint16) {
        return _countBits(store().value[key_]);
    }

    function storeBit(bytes32 key_) internal {
        store().value[key_] = 1;
    }

    function storeBitAt(bytes32 key_, uint8 index_) internal {
        store().value[key_] |= (1 << index_);
    }

    function _countBits(uint256 value_) private pure returns (uint16 bits) {
        while (value_ != 0) {
            if (value_ % 2 != 0) { unchecked { bits++; } } // prettier-ignore
            value_ >>= 1;
        }
    }
}
