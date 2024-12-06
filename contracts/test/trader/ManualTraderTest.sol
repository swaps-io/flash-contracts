// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IOrderReceiverManualNative} from "../../order/interfaces/IOrderReceiverManualNative.sol";

contract ManualTraderTest is IERC1271 {
    error HookUnauthorized();
    error UnexpectedBalance(uint256 balance, uint256 expectedBalance);

    IOrderReceiverManualNative public immutable receiver;
    address public immutable signer;

    uint256 public counter;

    constructor(address receiver_, address signer_) {
        receiver = IOrderReceiverManualNative(receiver_);
        signer = signer_;
    }

    modifier authHook(bytes32 orderHash_) {
        if (!receiver.receiveOrderAssetManualNativeActive(orderHash_)) revert HookUnauthorized();
        _;
    }

    function isValidSignature(bytes32 hash_, bytes memory signature_) external view returns (bytes4 magicValue) {
        return ECDSA.recover(hash_, signature_) == signer ? this.isValidSignature.selector : bytes4(0);
    }

    function receiveManualNativeHook(bytes32 orderHash_, uint256 expectedBalance_, uint256 increment_) external authHook(orderHash_) {
        uint256 balance = address(this).balance;
        if (balance != expectedBalance_) revert UnexpectedBalance(balance, expectedBalance_);

        counter += increment_;
    }
}
