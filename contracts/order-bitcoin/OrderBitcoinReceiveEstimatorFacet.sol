// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {OrderReceiverLib} from "../order/OrderReceiverLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {EventHashLib} from "../utils/EventHashLib.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";
import {Estimator} from "../utils/Estimator.sol";

import {IOrderBitcoinReceiveEstimator} from "./interfaces/IOrderBitcoinReceiveEstimator.sol";

import {OrderBitcoinReceiverLib} from "./OrderBitcoinReceiverLib.sol";
import {OrderBitcoinHashLib, OrderBitcoin} from "./OrderBitcoinHashLib.sol";

contract OrderBitcoinReceiveEstimatorFacet is IOrderBitcoinReceiveEstimator, Estimator {
    using SafeERC20 for IERC20;

    function estimateReceiveOrderBitcoinAsset(OrderBitcoin calldata order_, bytes calldata fromSignature_, address caller_) external onlyEstimate {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert OrderReceiveExpired();
        if (caller_ != order_.toActor) revert ReceiveCallerMismatch();
        if (!EnvLib.isThisChain(order_.fromChain)) revert ReceiveChainMismatch();

        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        bytes32 orderReceiveEventHash = EventHashLib.calcEventHash(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash);
        if (BitStorageLib.hasBitStored(orderReceiveEventHash)) revert OrderAlreadyReceived();

        if (fromSignature_.length != 0) SignatureLib.validateSignature(orderHash, fromSignature_, order_.fromActor);

        OrderBitcoinReceiverLib.store().collateralLocker.commitLock(caller_, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);
        BitStorageLib.storeBit(orderReceiveEventHash);

        IERC20(order_.fromToken).safeTransferFrom(order_.fromActor, caller_, order_.fromAmount);

        emit AssetReceive(orderHash);
    }
}
