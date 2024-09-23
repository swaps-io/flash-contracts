// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {SignatureLib} from "../../utils/SignatureLib.sol";

import {OrderBitcoinHashLib, OrderBitcoin} from "../../order-bitcoin/OrderBitcoinHashLib.sol";

contract OrderBitcoinSignatureTest is IERC1271 {
    uint256 public lastGasBefore;
    uint256 public lastGasAfterHash;
    uint256 public lastGasAfterSig;
    mapping(address signer => mapping(bytes signature => bool)) signatureApprove;

    function testSignature(OrderBitcoin calldata order_, bytes calldata signature_, address signer_) external {
        uint256 gasBefore = gasleft();
        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        uint256 gasAfterHash = gasleft();
        SignatureLib.validateSignature(orderHash, signature_, signer_);
        uint256 gasAfterSig = gasleft();

        lastGasBefore = gasBefore;
        lastGasAfterHash = gasAfterHash;
        lastGasAfterSig = gasAfterSig;
    }

    function isValidSignature(bytes32 hash_, bytes memory signature_) external view returns (bytes4 magicValue) {
        address signer = ECDSA.recover(hash_, signature_);
        bool isValid = signatureApprove[signer][signature_];
        return isValid ? bytes4(0x1626ba7e) : bytes4(0xdeadc0de);
    }

    function approveSignature(address signer_, bytes memory signature_) external {
        signatureApprove[signer_][signature_] = true;
    }
}
