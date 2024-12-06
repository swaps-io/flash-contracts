// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {IOrderReceiverManualNative} from "./interfaces/IOrderReceiverManualNative.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderReceiverLib} from "./OrderReceiverLib.sol";

contract OrderReceiverManualNativeFacet is IOrderReceiverManualNative {
    uint256 private constant NONCE_POST_HASH_BITS = ((1 << 160) - 1) << 96;
    uint256 private constant NONCE_POST_WITH_SEND_BIT = 1 << 95;
    uint256 private constant NONCE_POST_ALLOW_FAIL_BIT = 1 << 94;

    function receiveOrderAssetManualNative(Order calldata order_, bytes calldata toSignature_, bytes memory toPostData_) external payable {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (msg.sender != order_.fromActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();
        if (order_.fromToken != NativeLib.NATIVE_ADDRESS) revert OrderReceiveNotNative();

        bytes32 orderHash = OrderHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        SignatureLib.validateSignature(orderHash, toSignature_, order_.toActor);
        _validateNoncePostHash(order_.nonce, toPostData_);

        OrderReceiverLib.store().collateralLocker.commitLock(order_.toActor, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);

        if (toPostData_.length == 0) {
            BitStorageLib.storeBit(orderReceiveEventHash);

            NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount);
        } else {
            BitStorageLib.storeBits(orderReceiveEventHash, 3); // Bits: #0 - received, #1 - active

            if (order_.nonce & NONCE_POST_WITH_SEND_BIT != 0) {
                NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount, toPostData_);
            } else {
                NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount);

                (bool postSuccess, bytes memory postResult) = order_.toActor.call(toPostData_);
                if (order_.nonce & NONCE_POST_ALLOW_FAIL_BIT == 0) Address.verifyCallResultFromTarget(order_.toActor, postSuccess, postResult);
            }

            BitStorageLib.storeBit(orderReceiveEventHash); // Deactivate bit #1
        }

        emit AssetReceive(orderHash);
    }

    function receiveOrderAssetManualNativeActive(bytes32 orderHash_) external view returns (bool) {
        return BitStorageLib.hasBitStoredAt(EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash_), 1); // Bits: #1 - active
    }

    function _validateNoncePostHash(uint256 nonce_, bytes memory toPostData_) private pure {
        uint256 nonceHash = nonce_ & NONCE_POST_HASH_BITS;
        uint256 dataHash = uint256(keccak256(toPostData_)) & NONCE_POST_HASH_BITS;
        if (nonceHash != dataHash) revert OrderInvalidPostData();
    }
}
