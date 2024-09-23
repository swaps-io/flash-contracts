// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ICollateralLocker} from "../../collateral/interfaces/ICollateralLocker.sol";

struct OrderReceiverStorage {
    ICollateralLocker collateralLocker;
}
