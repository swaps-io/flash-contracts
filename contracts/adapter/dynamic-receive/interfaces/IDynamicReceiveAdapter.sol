// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

import {IOrderReceiver, Order} from "../../../order/interfaces/IOrderReceiver.sol";

import {ICollateralLocker} from "../../../collateral/interfaces/ICollateralLocker.sol";

interface IDynamicReceiveAdapter is IERC1271 {
    event AssetDynamicReceive(bytes32 indexed dynOrderHash, bytes32 indexed orderHash);

    error DynamicAlreadyReceived(bytes32 dynOrderHash, bytes32 orderHash);
    error FromActorMismatch(address fromActor, address expectedFromActor);
    error InsufficientFromAmount(uint256 fromAmount, uint256 minFromAmount);
    error OrderAlreadyReceived(bytes32 dynOrderHash, bytes32 orderHash);
    error OrderNotReceived(bytes32 dynOrderHash, bytes32 orderHash);

    function orderReceiver() external view returns (IOrderReceiver);

    function collateralLocker() external view returns (ICollateralLocker);

    function orderDynamicAssetReceived(bytes32 dynOrderHash) external view returns (bytes32 orderHash);

    function receiveOrderDynamicAsset(Order calldata dynOrder, bytes calldata dynToSignature) external;
}
