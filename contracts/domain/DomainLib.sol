// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

library DomainLib {
    // Typed data domain separator hash for "EIP712Domain(string name,string version)" with name "swaps-io/Flash", version "1"
    bytes32 internal constant DOMAIN_SEPARATOR = 0xc2ebf8d262eff7f48a5e68cb9da02fefd7a23d970026e3efafc7b571605f561c;

    function calcDomainHash(bytes32 structHash_) internal pure returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, structHash_);
    }
}
