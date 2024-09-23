// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

library SignatureLib {
    error InvalidSignature();

    function validateSignature(bytes32 hash_, bytes calldata signature_, address signer_) internal view {
        if (!SignatureChecker.isValidSignatureNow(signer_, hash_, signature_)) revert InvalidSignature();
    }

    // Based on OpenZeppelin library (v5.0.2) internal implementation. See "ECDSA.sol"
    function unpackVs(bytes32 vs_) internal pure returns (bytes32 s, uint8 v) {
        unchecked {
            s = vs_ & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
            v = uint8((uint256(vs_) >> 255) + 27);
        }
    }
}
