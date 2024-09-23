// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {BitStorageLib} from "../storage/BitStorageLib.sol";

import {EnvLib} from "../utils/EnvLib.sol";
import {Initializable} from "../utils/Initializable.sol";

import {IOrderBitcoinResolver, ICollateralUnlocker, IProofVerifier} from "./interfaces/IOrderBitcoinResolver.sol";

import {OrderActorHashLib} from "../order/OrderActorHashLib.sol";
import {OrderReceiverLib} from "../order/OrderReceiverLib.sol";
import {OrderSenderLib} from "../order/OrderSenderLib.sol";
import {OrderResolverLib} from "../order/OrderResolverLib.sol";

import {OrderBitcoinHashLib, OrderBitcoin} from "./OrderBitcoinHashLib.sol";
import {OrderBitcoinResolverLib, OrderBitcoinResolverStorage} from "./OrderBitcoinResolverLib.sol";

contract OrderBitcoinResolverFacet is IOrderBitcoinResolver, Initializable {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderBitcoinResolverFacet.Initializable")
    bytes32 private constant INITIALIZER_STORAGE_SLOT = 0x91fc62a68072cdc330880b4323a0ce513588ea1a4e9724da4d4ad2f3c81af6c6;

    function initializeOrderBitcoinResolverFacet(address collateralUnlocker_, address proofVerifier_) external initializer(INITIALIZER_STORAGE_SLOT) {
        OrderBitcoinResolverStorage storage s = OrderBitcoinResolverLib.store();
        s.collateralUnlocker = ICollateralUnlocker(collateralUnlocker_);
        s.proofVerifier = IProofVerifier(proofVerifier_);
    }

    function confirmOrderBitcoinAssetSend(OrderBitcoin calldata order_, bytes calldata receiveProof_, bytes calldata sendProof_) external {
        bytes32 orderHash = _validateOrder(order_);
        OrderBitcoinResolverStorage storage s = OrderBitcoinResolverLib.store();
        s.proofVerifier.verifyHashEventProof(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash, order_.fromChain, receiveProof_);
        s.proofVerifier.verifyHashEventProof(OrderSenderLib.ASSET_SEND_SIG, orderHash, order_.toChain, sendProof_);

        s.collateralUnlocker.approveUnlock(order_.toActor, order_.collateralAmount, order_.fromChain);
        BitStorageLib.storeBit(orderHash);
        emit OrderSendConfirm(orderHash);
    }

    function slashOrderBitcoinLiqCollateral(
        OrderBitcoin calldata order_,
        address liquidator_,
        bytes calldata receiveProof_,
        bytes calldata liqSendProof_
    ) external {
        _slashCollateral(order_, liquidator_, order_.collateralAmount, OrderSenderLib.ASSET_LIQ_SEND_SIG, receiveProof_, liqSendProof_);
    }

    function slashOrderBitcoinCollateral(OrderBitcoin calldata order_, address reporter_, bytes calldata receiveProof_, bytes calldata noSendProof_) external {
        _slashCollateral(order_, reporter_, order_.collateralRewardable, OrderSenderLib.ASSET_NO_SEND_SIG, receiveProof_, noSendProof_);
    }

    // prettier-ignore
    function bitcoinResolverCollateralUnlocker() external view returns (ICollateralUnlocker) { return OrderBitcoinResolverLib.store().collateralUnlocker; }

    // prettier-ignore
    function bitcoinResolverProofVerifier() external view returns (IProofVerifier) { return OrderBitcoinResolverLib.store().proofVerifier; }

    function _validateOrder(OrderBitcoin calldata order_) private view returns (bytes32 orderHash) {
        if (!EnvLib.isThisChain(order_.collateralChain)) revert CollateralChainMismatch();
        orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        if (OrderResolverLib.orderResolved(orderHash)) revert OrderAlreadyResolved();
    }

    function _slashCollateral(
        OrderBitcoin calldata order_,
        address rewardActor_,
        uint256 rewardAmount_,
        bytes32 rewardEventSig_,
        bytes calldata receiveProof_,
        bytes calldata rewardProof_
    ) private {
        bytes32 orderHash = _validateOrder(order_);
        OrderBitcoinResolverStorage storage s = OrderBitcoinResolverLib.store();
        s.proofVerifier.verifyHashEventProof(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash, order_.fromChain, receiveProof_);
        bytes32 orderActorHash = OrderActorHashLib.calcOrderActorHash(orderHash, rewardActor_);
        s.proofVerifier.verifyHashEventProof(rewardEventSig_, orderActorHash, order_.toChain, rewardProof_);

        if (rewardActor_ == order_.collateralReceiver || rewardAmount_ == 0) {
            s.collateralUnlocker.rejectUnlock(order_.toActor, order_.collateralAmount, order_.fromChain, order_.collateralReceiver);
        } else if (rewardAmount_ < order_.collateralAmount) {
            s.collateralUnlocker.rejectUnlock(order_.toActor, order_.collateralAmount - rewardAmount_, order_.fromChain, order_.collateralReceiver);
            s.collateralUnlocker.rejectUnlock(order_.toActor, rewardAmount_, order_.fromChain, rewardActor_);
        } else {
            s.collateralUnlocker.rejectUnlock(order_.toActor, order_.collateralAmount, order_.fromChain, rewardActor_);
        }

        BitStorageLib.storeBit(orderHash);
        emit OrderCollateralSlash(orderHash);
    }
}
