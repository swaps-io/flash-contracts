// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {DomainLib} from "../../domain/DomainLib.sol";

contract FlashDomainTest {
    error DomainSeparatorMismatch(bytes32 hash, bytes32 expectedHash);

    // prettier-ignore
    bytes32 private constant DOMAIN_TYPE_HASH = keccak256(
        "EIP712Domain("
            "string name,"
            "string version"
        ")"
    );

    bytes32 private constant DOMAIN_NAME_HASH = keccak256("swaps-io/Flash");

    bytes32 private constant DOMAIN_VERSION_HASH = keccak256("1");

    bytes32 private constant DOMAIN_SEPARATOR = keccak256(abi.encode(DOMAIN_TYPE_HASH, DOMAIN_NAME_HASH, DOMAIN_VERSION_HASH));

    function checkDomainSeparator() external pure {
        if (DomainLib.DOMAIN_SEPARATOR != DOMAIN_SEPARATOR) {
            revert DomainSeparatorMismatch(DomainLib.DOMAIN_SEPARATOR, DOMAIN_SEPARATOR);
        }
    }
}
