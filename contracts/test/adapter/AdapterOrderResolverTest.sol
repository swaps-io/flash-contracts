// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IOrderReceiver} from "../../order/interfaces/IOrderReceiver.sol";

import {IAdapterOrderResolver, Order} from "../../adapter/interfaces/IAdapterOrderResolver.sol";

contract AdapterOrderResolverTest is IAdapterOrderResolver {
    error InvalidAdapterCaller(address caller, address expectedCaller);

    IOrderReceiver public immutable orderReceiver;
    address public immutable adapterCaller;

    bytes32 public expectedValidSignatureParamsHash;

    constructor(address orderReceiver_, address adapterCaller_) {
        orderReceiver = IOrderReceiver(orderReceiver_);
        adapterCaller = adapterCaller_;
    }

    function setExpectedValidSignatureParams(bytes32 expectedHash_, bytes memory expectedSignature_) external {
        expectedValidSignatureParamsHash = _hashSignatureParams(expectedHash_, expectedSignature_);
    }

    function isValidSignature(bytes32 hash_, bytes memory signature_) external view returns (bytes4 magicValue) {
        return _hashSignatureParams(hash_, signature_) == expectedValidSignatureParamsHash ? this.isValidSignature.selector : bytes4(0);
    }

    function receiveAdapterOrderAsset(Order calldata order_) external {
        if (msg.sender != adapterCaller) revert InvalidAdapterCaller(msg.sender, adapterCaller);
        orderReceiver.receiveOrderAsset(order_, "");
    }

    function _hashSignatureParams(bytes32 hash_, bytes memory signature_) private pure returns (bytes32) {
        return keccak256(abi.encode(hash_, signature_));
    }
}
