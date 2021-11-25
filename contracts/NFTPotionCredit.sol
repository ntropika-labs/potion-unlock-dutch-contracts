// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Allows buyer to purchase items for free
*/
contract NFTPotionCredit is Ownable {
    // Whitelist
    mapping(address => uint256) public credit;

    constructor() {}

    /**
        @notice Adds credit to a list of buyers

        @param buyers List of buyers to add credit to
        @param amounts List of amounts of credit to add

    */
    function addCredit(address[] calldata buyers, uint128[] calldata amounts) external onlyOwner {
        require(buyers.length > 0, "Trying to whitelist with empty array");
        require(buyers.length == amounts.length, "Mismatch in array sizes for direct whitelist");

        for (uint256 i = 0; i < amounts.length; ++i) {
            credit[buyers[i]] += amounts[i];
        }
    }

    /**
        @notice Adds the given amount to the buyer's credit

        @param buyer The buyer to add credit to
        @param amount The amount of credit to add
    */
    function addCredit(address buyer, uint128 amount) external onlyOwner {
        credit[buyer] += amount;
    }

    // Internal functions

    /** 
        @notice Consumes the given amount of credit from the buyer

        @param buyer The buyer to consume credit from
        @param amount The amount of credit to consume
     */
    function consumeCredit(address buyer, uint256 amount) internal {
        require(credit[buyer] >= amount, "Not enough credit to consume");

        credit[buyer] -= amount;
    }

    // View functions

    /**
        @notice Returns the amount of credit a buyer has

        @param buyer Address of the buyer 
    */
    function getCredit(address buyer) public view returns (uint256) {
        return credit[buyer];
    }
}
