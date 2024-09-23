// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {ERC20Permit, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

abstract contract TestToken is ERC20Permit {
    uint8 private immutable _DECIMALS;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) ERC20Permit(name_) {
        _DECIMALS = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _DECIMALS;
    }

    function mint(address account_, uint256 amount_) external virtual {
        _mint(account_, amount_);
    }
}
