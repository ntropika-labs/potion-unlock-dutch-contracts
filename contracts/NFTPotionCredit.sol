// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Handles the credit that a buyer has for a specific rarity ID. This can be
    used to give a buyer NFTs for a specific rarity for free
*/
contract NFTPotionCredit is Ownable {
    /**
        Buyer's credit (buyer's address => (rarityId, credit))
    
        A buyers given credit to purchase for free an amount of NFTs
        from a given rarity ID
    */
    mapping(address => mapping(uint256 => uint256)) private credit;

    // Events
    event CreditAdded(address buyer, uint256 rarityId, uint256 amount);
    event CreditConsumed(address buyer, uint256 rarityId, uint256 amount);

    /**
        @notice Adds credit to a list of buyers

        @param buyers List of buyers to add credit to
        @param rarityIds List of rarity IDs to add credit for
        @param amounts List of amounts of credit to add

        @dev Only owner

    */
    function addCreditAll(
        address[] calldata buyers,
        uint256[] calldata rarityIds,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(buyers.length > 0, "Trying to add credit with empty array");
        require(
            buyers.length == rarityIds.length && buyers.length == amounts.length,
            "Mismatch in array sizes for adding credit"
        );

        for (uint256 i = 0; i < amounts.length; ++i) {
            _addCredit(buyers[i], rarityIds[i], amounts[i]);
        }
    }

    /**
        @notice Adds the given amount to the buyer's credit

        @param buyer The buyer to add credit to
        @param rarityId The rarity ID to add credit for
        @param amount The amount of credit to add

        @dev Only owner
    */
    function addCredit(
        address buyer,
        uint256 rarityId,
        uint256 amount
    ) external onlyOwner {
        _addCredit(buyer, rarityId, amount);
    }

    // Internal functions

    /**
        @notice Adds the given amount to the buyer's credit

        @param buyer The buyer to add credit to
        @param rarityId The rarity ID to add credit for
        @param amount The amount of credit to add
     */
    function _addCredit(
        address buyer,
        uint256 rarityId,
        uint256 amount
    ) internal {
        credit[buyer][rarityId] += amount;

        emit CreditAdded(buyer, rarityId, amount);
    }

    /** 
        @notice Consumes the given amount of credit from the buyer

        @param buyer The buyer to consume credit from
        @param rarityId The rarity ID to consume credit for
        @param amount The amount of credit to consume
     */
    function _consumeCredit(
        address buyer,
        uint256 rarityId,
        uint256 amount
    ) internal {
        require(credit[buyer][rarityId] >= amount, "Not enough credit to consume");

        credit[buyer][rarityId] -= amount;

        emit CreditConsumed(buyer, rarityId, amount);
    }

    // View functions

    /**
        @notice Returns the amount of credit a buyer has

        @param buyer Address of the buyer 
        @param rarityId The rarity ID to get credit for
    */
    function getCredit(address buyer, uint256 rarityId) public view returns (uint256) {
        return credit[buyer][rarityId];
    }
}
