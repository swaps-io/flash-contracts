// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {OrderMemHashLib} from "../../order/OrderMemHashLib.sol";

import {SignatureLib} from "../../utils/SignatureLib.sol";

import {IAdapterOrderResolver} from "../interfaces/IAdapterOrderResolver.sol";

import {IDynamicReceiveAdapter, Order, IOrderReceiver, ICollateralLocker} from "./interfaces/IDynamicReceiveAdapter.sol";

contract DynamicReceiveAdapter is IDynamicReceiveAdapter {
    IOrderReceiver public immutable orderReceiver;
    ICollateralLocker public immutable collateralLocker;

    mapping(bytes32 dynOrderHash => bytes32) public orderDynamicAssetReceived;

    constructor(address orderReceiver_, address collateralLocker_) {
        orderReceiver = IOrderReceiver(orderReceiver_);
        collateralLocker = ICollateralLocker(collateralLocker_);
    }

    function receiveOrderDynamicAsset(Order memory dynOrder_, bytes calldata dynToSignature_) external {
        if (dynOrder_.fromActor != address(this)) revert FromActorMismatch(dynOrder_.fromActor, address(this));
        bytes32 dynOrderHash = OrderMemHashLib.calcOrderHash(dynOrder_);
        if (orderDynamicAssetReceived[dynOrderHash] != 0) revert DynamicAlreadyReceived(dynOrderHash, orderDynamicAssetReceived[dynOrderHash]);
        SignatureLib.validateSignature(dynOrderHash, dynToSignature_, dynOrder_.toActor);

        IERC20 fromToken = IERC20(dynOrder_.fromToken);
        uint256 fromAmount = fromToken.balanceOf(address(this));
        if (fromAmount < dynOrder_.fromAmount) revert InsufficientFromAmount(fromAmount, dynOrder_.fromAmount);

        dynOrder_.fromAmount = fromAmount;
        dynOrder_.collateralUnlocked = collateralLocker.externalUnlockCounter(dynOrder_.toActor, dynOrder_.collateralChain);

        bytes32 orderHash = OrderMemHashLib.calcOrderHash(dynOrder_);
        orderDynamicAssetReceived[dynOrderHash] = orderHash;

        if (orderReceiver.orderAssetReceived(orderHash)) revert OrderAlreadyReceived(dynOrderHash, orderHash);

        if (fromToken.allowance(address(this), address(orderReceiver)) < fromAmount)
            SafeERC20.forceApprove(fromToken, address(orderReceiver), type(uint256).max);

        IAdapterOrderResolver(dynOrder_.toActor).receiveAdapterOrderAsset(dynOrder_);

        if (!orderReceiver.orderAssetReceived(orderHash)) revert OrderNotReceived(dynOrderHash, orderHash);

        emit AssetDynamicReceive(dynOrderHash, orderHash);
    }

    function isValidSignature(bytes32, bytes memory) external pure returns (bytes4) {
        return this.isValidSignature.selector;
    }
}
