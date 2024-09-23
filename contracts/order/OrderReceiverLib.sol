// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {OrderReceiverStorage} from "./interfaces/OrderReceiverStorage.sol";

library OrderReceiverLib {
    // keccak256("AssetReceive(bytes32)")
    bytes32 internal constant ASSET_RECEIVE_SIG = 0xebd49f22611487a9df09f5dfbcabfa4aa714bf6c3859fa6d901fba02e205f71f;

    // keccak256("com.swaps-io.flash.diamond.storage.OrderReceiverLib")
    bytes32 private constant STORAGE_SLOT = 0xba2de5bd81f89ee2196845b085776d4f123bf41ad08f63ccc91e9938b4ba9600;

    function store() internal pure returns (OrderReceiverStorage storage s) {
        assembly { s.slot := STORAGE_SLOT } // prettier-ignore
    }
}
