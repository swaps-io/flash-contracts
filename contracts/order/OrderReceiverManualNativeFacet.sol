// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";

import {NativeLib} from "../native/NativeLib.sol";

import {IOrderReceiverManualNative} from "./interfaces/IOrderReceiverManualNative.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderReceiverLib} from "./OrderReceiverLib.sol";

contract OrderReceiverManualNativeFacet is IOrderReceiverManualNative {
    function receiveOrderAssetManualNative(Order calldata order_, bytes calldata toSignature_) external payable {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (msg.sender != order_.fromActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();
        if (order_.fromToken != NativeLib.NATIVE_ADDRESS) revert OrderReceiveNotNative();

        bytes32 orderHash = OrderHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        SignatureLib.validateSignature(orderHash, toSignature_, order_.toActor);

        OrderReceiverLib.store().collateralLocker.commitLock(order_.toActor, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        NativeLib.transferFrom(msg.sender, order_.toActor, order_.fromAmount);

        emit AssetReceive(orderHash);
    }
}
