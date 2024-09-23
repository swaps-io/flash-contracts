// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {Initializable} from "../utils/Initializable.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";

import {IOrderReceiver, ICollateralLocker} from "./interfaces/IOrderReceiver.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderReceiverLib} from "./OrderReceiverLib.sol";

contract OrderReceiverFacet is IOrderReceiver, Initializable {
    using SafeERC20 for IERC20;

    // keccak256("com.swaps-io.flash.diamond.storage.OrderReceiverFacet.Initializable")
    bytes32 private constant INITIALIZER_STORAGE_SLOT = 0x3a9d36521d0fff9239e47be984630c34c26f0c274020712139ae27e7b2c1da3b;

    function initializeOrderReceiverFacet(address collateralLocker_) external initializer(INITIALIZER_STORAGE_SLOT) {
        OrderReceiverLib.store().collateralLocker = ICollateralLocker(collateralLocker_);
    }

    function receiveOrderAsset(Order calldata order_, bytes calldata fromSignature_) external {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (msg.sender != order_.toActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();

        bytes32 orderHash = OrderHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        SignatureLib.validateSignature(orderHash, fromSignature_, order_.fromActor);

        OrderReceiverLib.store().collateralLocker.commitLock(msg.sender, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        IERC20(order_.fromToken).safeTransferFrom(order_.fromActor, msg.sender, order_.fromAmount);

        emit AssetReceive(orderHash);
    }

    function orderAssetReceived(bytes32 orderHash_) public view returns (bool) {
        return BitStorageLib.hasBitStored(EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash_));
    }

    // prettier-ignore
    function receiverCollateralLocker() external view returns (ICollateralLocker) { return OrderReceiverLib.store().collateralLocker; }
}
