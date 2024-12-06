// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IOrderReceiverManualNative} from "../../order/interfaces/IOrderReceiverManualNative.sol";

contract ManualTraderTest is IERC1271 {
    error HookUnauthorized();
    error BalanceUnexpected(uint256 balance, uint256 expectedBalance);

    IOrderReceiverManualNative public immutable receiver;
    address public immutable signer;

    bytes32 public lastOrderHash;
    uint256 public counter;

    constructor(address receiver_, address signer_) {
        receiver = IOrderReceiverManualNative(receiver_);
        signer = signer_;
    }

    modifier authHook() {
        if (_activeOrderHash() == 0) revert HookUnauthorized();
        _;
    }

    function isValidSignature(bytes32 hash_, bytes memory signature_) external view returns (bytes4) {
        return ECDSA.recover(hash_, signature_) == signer ? this.isValidSignature.selector : bytes4(0);
    }

    function receiveManualNativeHook(uint256 expectedBalance_, uint256 increment_) external authHook {
        lastOrderHash = _activeOrderHash();

        uint256 balance = address(this).balance;
        if (balance != expectedBalance_) revert BalanceUnexpected(balance, expectedBalance_);

        counter += increment_;
    }

    function _activeOrderHash() private view returns (bytes32) {
        return receiver.receiveOrderAssetManualNativeActive(address(this));
    }
}
