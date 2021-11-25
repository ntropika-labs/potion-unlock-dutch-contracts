// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

library Utils {
    /**
        @notice Helper function to get the minimum of 2 values
    */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }
}
