// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {OrderReceiverLib} from "../order/OrderReceiverLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {Initializable} from "../utils/Initializable.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";

import {IOrderBitcoinReceiver, ICollateralLocker} from "./interfaces/IOrderBitcoinReceiver.sol";

import {OrderBitcoinReceiverLib} from "./OrderBitcoinReceiverLib.sol";
import {OrderBitcoinHashLib, OrderBitcoin} from "./OrderBitcoinHashLib.sol";

contract OrderBitcoinReceiverFacet is IOrderBitcoinReceiver, Initializable {
    using SafeERC20 for IERC20;

    // keccak256("com.swaps-io.flash.diamond.storage.OrderBitcoinReceiverFacet.Initializable")
    bytes32 private constant INITIALIZER_STORAGE_SLOT = 0x55c5e78283d576cea7c0fff2ed9ad38f7ddadac25819e68ec2df32b0a4ae2608;

    function initializeOrderBitcoinReceiverFacet(address collateralLocker_) external initializer(INITIALIZER_STORAGE_SLOT) {
        OrderBitcoinReceiverLib.store().collateralLocker = ICollateralLocker(collateralLocker_);
    }

    function receiveOrderBitcoinAsset(OrderBitcoin calldata order_, bytes calldata fromSignature_) external {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (msg.sender != order_.toActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();

        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        SignatureLib.validateSignature(orderHash, fromSignature_, order_.fromActor);

        OrderBitcoinReceiverLib.store().collateralLocker.commitLock(msg.sender, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        IERC20(order_.fromToken).safeTransferFrom(order_.fromActor, msg.sender, order_.fromAmount);

        emit AssetReceive(orderHash);
    }

    // prettier-ignore
    function bitcoinReceiverCollateralLocker() external view returns (ICollateralLocker) { return OrderBitcoinReceiverLib.store().collateralLocker; }
}
