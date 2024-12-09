// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

library ManualNativeNonceLib {
    error InvalidNoncePostData();

    uint256 internal constant POST_HASH_BITS = ((1 << 160) - 1) << 96;
    uint256 internal constant POST_WITH_SEND_BIT = 1 << 95;
    uint256 internal constant POST_ALLOW_FAIL_BIT = 1 << 94;

    function validatePostData(uint256 nonce_, bytes memory postData_) internal pure {
        uint256 nonceHash = nonce_ & POST_HASH_BITS;
        uint256 dataHash = uint256(keccak256(postData_)) & POST_HASH_BITS;
        if (nonceHash != dataHash) revert InvalidNoncePostData();
    }
}
