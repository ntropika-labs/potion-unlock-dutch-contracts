// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

library Utils {
    /**
        @notice Helper functions to get the minimum of 2 values
    */
    function min256(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }

    function min32(uint32 a, uint32 b) internal pure returns (uint32) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }
}
