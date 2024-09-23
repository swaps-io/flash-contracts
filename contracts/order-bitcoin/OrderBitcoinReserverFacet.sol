// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {EnvLib} from "../utils/EnvLib.sol";
import {Initializable} from "../utils/Initializable.sol";
import {SignatureLib} from "../utils/SignatureLib.sol";

import {OrderActorHashLib} from "../order/OrderActorHashLib.sol";

import {IOrderBitcoinReserver, OrderBitcoin, ICollateralLocker, IProofVerifier, BitcoinCollateralState} from "./interfaces/IOrderBitcoinReserver.sol";

import {OrderBitcoinHashLib, OrderBitcoin} from "./OrderBitcoinHashLib.sol";
import {OrderBitcoinReserverLib, OrderBitcoinReserverStorage} from "./OrderBitcoinReserverLib.sol";

contract OrderBitcoinReserverFacet is IOrderBitcoinReserver, Initializable {
    // keccak256("com.swaps-io.flash.diamond.storage.OrderBitcoinReserverFacet.Initializable")
    bytes32 private constant INITIALIZER_STORAGE_SLOT = 0x189fd8400ab77cd3f5cae65b56e3e93d1ca669bf2f062d1d373cdcde731bdd1f;

    // keccak256("Any address, one transaction")
    bytes32 private constant ANY_BITCOIN_ADDRESS_HASH = 0x0680750672a95924ec2b7a0673ab32636ddf3de097759cfbd8ec6051e0061d92;

    function initializeOrderBitcoinReserverFacet(address collateralLocker_, address proofVerifier_) external initializer(INITIALIZER_STORAGE_SLOT) {
        OrderBitcoinReserverStorage storage s = OrderBitcoinReserverLib.store();
        s.collateralLocker = ICollateralLocker(collateralLocker_);
        s.proofVerifier = IProofVerifier(proofVerifier_);
    }

    function lockOrderBitcoinCollateral(OrderBitcoin calldata order_, bytes calldata fromSignature_) external {
        if (!EnvLib.isActiveDeadline(order_.deadline)) revert BitcoinLockExpired();
        if (msg.sender != order_.toActor) revert BitcoinLockerMismatch();
        if (!EnvLib.isThisChain(order_.collateralChain)) revert BitcoinLockChainMismatch();

        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);
        SignatureLib.validateSignature(orderHash, fromSignature_, order_.fromActor);

        OrderBitcoinReserverStorage storage s = OrderBitcoinReserverLib.store();
        if (s.collateralState[orderHash] != BitcoinCollateralState.Pending) revert BitcoinLockRefusal();
        s.collateralState[orderHash] = BitcoinCollateralState.Locked;

        if (keccak256(bytes(order_.fromActorBitcoin)) == ANY_BITCOIN_ADDRESS_HASH) {
            bytes32 orderHashUsed = s.bitcoinAddressUsedOrder[order_.toActorBitcoin];
            if (orderHashUsed != bytes32(0)) revert BitcoinAddressUsed(order_.toActorBitcoin, orderHashUsed);
            s.bitcoinAddressUsedOrder[order_.toActorBitcoin] = orderHash;
        }

        s.collateralLocker.commitLock(msg.sender, order_.collateralAmount, order_.collateralChain, order_.collateralUnlocked);

        emit BitcoinCollateralLock(orderHash);
    }

    function unlockOrderBitcoinCollateral(OrderBitcoin calldata order_, bytes calldata noReceiveProof_) external {
        bytes32 orderHash = OrderBitcoinHashLib.calcOrderHash(order_);

        OrderBitcoinReserverStorage storage s = OrderBitcoinReserverLib.store();
        if (s.collateralState[orderHash] != BitcoinCollateralState.Locked) revert BitcoinUnlockRefusal();
        s.collateralState[orderHash] = BitcoinCollateralState.Unlocked;

        bytes32 eventHash = OrderActorHashLib.calcOrderActorHash(orderHash, order_.toActor);
        s.proofVerifier.verifyHashEventProof(OrderBitcoinReserverLib.ASSET_NO_RECEIVE_SIG, eventHash, order_.fromChain, noReceiveProof_);
        s.collateralLocker.cancelLock(order_.toActor, order_.collateralAmount, order_.collateralChain);

        emit BitcoinCollateralUnlock(orderHash);
    }

    function orderBitcoinCollateralState(bytes32 orderHash_) external view returns (BitcoinCollateralState) {
        return OrderBitcoinReserverLib.store().collateralState[orderHash_];
    }

    function bitcoinAddressUsedOrder(string calldata bitcoinAddress_) external view returns (bytes32) {
        return OrderBitcoinReserverLib.store().bitcoinAddressUsedOrder[bitcoinAddress_];
    }

    // prettier-ignore
    function bitcoinReserverCollateralLocker() external view returns (ICollateralLocker) { return OrderBitcoinReserverLib.store().collateralLocker; }

    // prettier-ignore
    function bitcoinReserverProofVerifier() external view returns (IProofVerifier) { return OrderBitcoinReserverLib.store().proofVerifier; }
}
