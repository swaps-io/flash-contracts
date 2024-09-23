// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

library OrderActorHashLib {
    function calcOrderActorHash(bytes32 orderHash_, address actor_) internal pure returns (bytes32) {
        return keccak256(abi.encode(orderHash_, actor_));
    }
}
