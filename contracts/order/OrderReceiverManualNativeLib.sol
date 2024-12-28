// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {OrderReceiverManualNativeStorage} from "./interfaces/OrderReceiverManualNativeStorage.sol";

library OrderReceiverManualNativeLib {
    error InvalidNoncePostData();

    uint256 internal constant POST_HASH_BITS = ((1 << 160) - 1) << 96;
    uint256 internal constant POST_WITH_SEND_BIT = 1 << 95;
    uint256 internal constant POST_ALLOW_FAIL_BIT = 1 << 94;

    // keccak256("com.swaps-io.flash.diamond.storage.OrderReceiverManualNativeLib")
    bytes32 private constant STORAGE_SLOT = 0x41e920b0811adecf39a5e7195128248e4d371314e929cecde761115a68cca65f;

    function store() internal pure returns (OrderReceiverManualNativeStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }

    function validatePostData(uint256 nonce_, bytes memory postData_) internal pure {
        uint256 nonceHash = nonce_ & POST_HASH_BITS;
        if (nonceHash == 0) {
            if (postData_.length != 0) revert InvalidNoncePostData();
            return;
        }

        uint256 dataHash = uint256(keccak256(postData_)) & POST_HASH_BITS;
        if (nonceHash != dataHash) revert InvalidNoncePostData();
    }

    function transferFrom(bytes32 hash_, uint256 nonce_, address sender_, address receiver_, uint256 amount_, bytes memory data_) internal {
        transferFrom(hash_, nonce_, sender_, receiver_, amount_, data_, NativeLib.VALUE_ORIGINAL_BIT);
    }

    function transferFrom(bytes32 hash_, uint256 nonce_, address sender_, address receiver_, uint256 amount_, bytes memory data_, uint256 value_) internal {
        if (data_.length == 0) NativeLib.transferFrom(sender_, receiver_, amount_, value_);
        else {
            store().activeOrderHash[receiver_] = hash_;

            if (nonce_ & POST_WITH_SEND_BIT != 0) {
                NativeLib.transferFrom(sender_, receiver_, amount_, value_, data_);
            } else {
                NativeLib.transferFrom(sender_, receiver_, amount_, value_);

                (bool postSuccess, bytes memory postResult) = receiver_.call(data_);
                if (nonce_ & POST_ALLOW_FAIL_BIT == 0) Address.verifyCallResultFromTarget(receiver_, postSuccess, postResult);
            }

            delete store().activeOrderHash[receiver_];
        }
    }
}
