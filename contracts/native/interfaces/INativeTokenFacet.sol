// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.24;

import {IERC20Native} from "./IERC20Native.sol";

interface INativeTokenFacetErrors {
    error ZeroNativeToken();
}

interface INativeTokenFacetViews {
    function nativeToken() external view returns (IERC20Native);
}

interface INativeTokenFacet is INativeTokenFacetErrors, INativeTokenFacetViews {}
