// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Handles access for accessing the contract functions
 */
contract NFTPotionAccessList is Ownable {
    // access list (caller address, access status)
    mapping(address => bool) public canAccess;

    // Modifiers
    modifier checkCallerAccess() {
        require(canAccess[_msgSender()], "AccessList: Caller doesn't have access");
        _;
    }

    /**
        @notice Adds a new caller to the access list

        @param caller The address of the caller
        @param allow True if the caller has access, false otherwise

        @dev Only admin
    */
    function setAccess(address caller, bool allow) external onlyOwner {
        canAccess[caller] = allow;
    }

    /**
        @notice Adds a list of callers to the access list

        @param callers The list of addresses of the callers
        @param allow True if the caller has access, false otherwise

        @dev Only admin
    */
    function setAccessAll(address[] calldata callers, bool allow) external onlyOwner {
        for (uint256 i = 0; i < callers.length; i++) {
            canAccess[callers[i]] = allow;
        }
    }
}
