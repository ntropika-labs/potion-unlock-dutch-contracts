// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Handles KYC for accessing the contract functions
 */
contract NFTPotionKYC is Ownable {
    // KYC list (customer address, KYC status)
    mapping(address => bool) public isKnownCustomer;

    // Events
    event CustomerKnown(address indexed customer);

    // Modifiers
    modifier onlyKnownCustomer() {
        require(isKnownCustomer[_msgSender()], "KYC: Caller not known");
        _;
    }

    /**
        @notice Adds a new customer to the KYC list

        @param customer The address of the customer
        @param isKnown True if the customer is known, false otherwise

        @dev Only admin
    */
    function setKYC(address customer, bool isKnown) external onlyOwner {
        isKnownCustomer[customer] = isKnown;
    }

    /**
        @notice Adds a list of customers to the KYC list

        @param customers The list of addresses of the customers
        @param isKnown True if the customer is known, false otherwise

        @dev Only admin
    */
    function setKYC(address[] calldata customers, bool isKnown) external onlyOwner {
        for (uint256 i = 0; i < customers.length; i++) {
            isKnownCustomer[customers[i]] = isKnown;
        }
    }
}
