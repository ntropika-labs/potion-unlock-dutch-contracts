// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Allows buyer to purchase items for free for a given items ID set
*/
contract NFTPotionCredit is Ownable {
    /**
        Buyer's credit (buyer's address => (itemsId, credit))
    
        A buyers given credit to purchase for free an amount of items
        from a given items id set
    */
    mapping(address => mapping(uint256 => uint256)) private credit;

    /**
        @notice Adds credit to a list of buyers

        @param buyers List of buyers to add credit to
        @param itemsIds List of items ids to add credit for
        @param amounts List of amounts of credit to add

    */
    function addCredit(
        address[] calldata buyers,
        uint256[] calldata itemsIds,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(buyers.length > 0, "Trying to whitelist with empty array");
        require(
            buyers.length == itemsIds.length || buyers.length == amounts.length,
            "Mismatch in array sizes for direct whitelist"
        );

        for (uint256 i = 0; i < amounts.length; ++i) {
            credit[buyers[i]][itemsIds[i]] += amounts[i];
        }
    }

    /**
        @notice Adds the given amount to the buyer's credit

        @param buyer The buyer to add credit to
        @param itemsId The items id to add credit for
        @param amount The amount of credit to add
    */
    function addCredit(
        address buyer,
        uint256 itemsId,
        uint128 amount
    ) external onlyOwner {
        credit[buyer][itemsId] += amount;
    }

    // Internal functions

    /** 
        @notice Consumes the given amount of credit from the buyer

        @param buyer The buyer to consume credit from
        @param itemsId The items id to consume credit for
        @param amount The amount of credit to consume
     */
    function _consumeCredit(
        address buyer,
        uint256 itemsId,
        uint256 amount
    ) internal {
        require(credit[buyer][itemsId] >= amount, "Not enough credit to consume");

        credit[buyer][itemsId] -= amount;
    }

    // View functions

    /**
        @notice Returns the amount of credit a buyer has

        @param buyer Address of the buyer 
    */
    function getCredit(address buyer, uint256 itemsId) public view returns (uint256) {
        return credit[buyer][itemsId];
    }
}
