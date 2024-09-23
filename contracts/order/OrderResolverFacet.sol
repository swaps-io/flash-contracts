// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {EnvLib} from "../utils/EnvLib.sol";
import {Initializable} from "../utils/Initializable.sol";

import {IOrderResolver, ICollateralUnlocker, IProofVerifier} from "./interfaces/IOrderResolver.sol";

import {OrderHashLib, Order} from "./OrderHashLib.sol";
import {OrderActorHashLib} from "./OrderActorHashLib.sol";
import {OrderReceiverLib} from "./OrderReceiverLib.sol";
import {OrderSenderLib} from "./OrderSenderLib.sol";
import {OrderResolverLib, OrderResolverStorage, BitStorageLib} from "./OrderResolverLib.sol";

contract OrderResolverFacet is IOrderResolver, Initializable {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderResolverFacet.Initializable")
    bytes32 private constant INITIALIZER_STORAGE_SLOT = 0x54caa9b968ad4f9d88346785551baf135de04b06a3673fc87a25276093a8f04b;

    function initializeOrderResolverFacet(address collateralUnlocker_, address proofVerifier_) external initializer(INITIALIZER_STORAGE_SLOT) {
        OrderResolverStorage storage s = OrderResolverLib.store();
        s.collateralUnlocker = ICollateralUnlocker(collateralUnlocker_);
        s.proofVerifier = IProofVerifier(proofVerifier_);
    }

    function confirmOrderAssetSend(Order calldata order_, bytes calldata receiveProof_, bytes calldata sendProof_) external {
        bytes32 orderHash = _validateOrder(order_);
        OrderResolverStorage storage s = OrderResolverLib.store();
        s.proofVerifier.verifyHashEventProof(OrderReceiverLib.ASSET_RECEIVE_SIG, orderHash, order_.fromChain, receiveProof_);
        s.proofVerifier.verifyHashEventProof(OrderSenderLib.ASSET_SEND_SIG, orderHash, order_.toChain, sendProof_);

        s.collateralUnlocker.approveUnlock(order_.toActor, order_.collateralAmount, order_.fromChain);
        BitStorageLib.storeBit(orderHash);
        emit OrderSendConfirm(orderHash);
    }

    function slashOrderLiqCollateral(Order calldata order_, address liquidator_, bytes calldata receiveProof_, bytes calldata liqSendProof_) external {
        _slashCollateral(order_, liquidator_, order_.collateralAmount, OrderSenderLib.ASSET_LIQ_SEND_SIG, receiveProof_, liqSendProof_);
    }

    function slashOrderCollateral(Order calldata order_, address reporter_, bytes calldata receiveProof_, bytes calldata noSendProof_) external {
        _slashCollateral(order_, reporter_, order_.collateralRewardable, OrderSenderLib.ASSET_NO_SEND_SIG, receiveProof_, noSendProof_);
    }

    function orderResolved(bytes32 orderHash_) external view returns (bool) {
        return OrderResolverLib.orderResolved(orderHash_);
    }

    // prettier-ignore
    function resolverCollateralUnlocker() external view returns (ICollateralUnlocker) { return OrderResolverLib.store().collateralUnlocker; }

    // prettier-ignore
    function resolverProofVerifier() external view returns (IProofVerifier) { return OrderResolverLib.store().proofVerifier; }

    function _validateOrder(Order calldata order_) private view returns (bytes32 orderHash) {
        if (!EnvLib.isThisChain(order_.collateralChain)) revert CollateralChainMismatch();
        orderHash = OrderHashLib.calcOrderHash(order_);
        if (OrderResolverLib.orderResolved(orderHash)) revert OrderAlreadyResolved();
    }

    function _slashCollateral(
        Order calldata order_,
        address rewardActor_,
        uint256 rewardAmount_,
        bytes32 rewardEventSig_,
        bytes calldata receiveProof_,
        bytes calldata rewardProof_
    ) private {
        bytes32 orderHash = _validateOrder(order_);
        OrderResolverStorage storage s = OrderResolverLib.store();
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
