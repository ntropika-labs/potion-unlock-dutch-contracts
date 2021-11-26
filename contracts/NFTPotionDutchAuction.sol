// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./NFTPotionCredit.sol";
import "./NFTPotionAccessList.sol";
import "./NFTPotionFunds.sol";
import "./utils/Utils.sol";

/**
    Manual Dutch Auction to sell items at a changing price

    @dev This contract is used to sell items at a changing price. The price changes are done manually through
    the changePrice function. In principle the price should be lowered over time, but this is not implemented
    and it is the responsability of the user to do it.

    @dev The batchId parameter passed in the contract is an identifier that will be passed to the _purchaseItems
    function to help the child contract identify which batch of items the user wants to purchase. If there are no
    batches, the batchId can be any value and can be ignored when overriding the _purchaseItems function.
 */

contract NFTPotionDutchAuction is NFTPotionFunds, NFTPotionAccessList, NFTPotionCredit {
    // Auction state
    uint256 public itemsId;
    uint256 public purchasePrice;
    bool public isAuctionActive;

    // Events
    event Purchase(uint256 indexed itemsId, address indexed buyer, uint64 numTokens);

    // Modifiers
    modifier checkAuctionActive() {
        require(isAuctionActive, "Auction is not active");
        _;
    }
    modifier checkNotSoldOut() {
        require(_getRemainingItems(itemsId) > 0, "Auction is sold out");
        _;
    }

    // Auction management

    /**
        @notice Starts a new auction starting at the given price, for the given number of items.

        @param _itemsId The identifier of the items to be auctioned
        @param _purchasePrice The starting price of the tokens.
    */
    function startAuction(uint256 _itemsId, uint256 _purchasePrice) external onlyOwner {
        require(!isAuctionActive, "Auction is already active");
        require(_getRemainingItems(_itemsId) > 0, "Items are already sold out");

        itemsId = _itemsId;
        purchasePrice = _purchasePrice;
        isAuctionActive = true;
    }

    /**
        @notice Stops the auction
     */
    function stopAuction() external onlyOwner {
        isAuctionActive = false;
    }

    /**
        @notice Changes the purchase price of the auction

        @param newPrice The new purchase price
     */
    function changePrice(uint256 newPrice) external onlyOwner checkAuctionActive {
        require(newPrice > 0, "New price must be greater than 0");
        purchasePrice = newPrice;
    }

    /**
        @notice Mints a batch of tokenIDs

        @param amount The amount of assets to buy
        @param publicKey The public key of the buyer

        @dev The function ensures that no more than the maximum number of items will be purchased,
        so the implementer of the delegator function does not need to check for this.
     */
    function purchase(uint256 amount, string calldata publicKey)
        external
        payable
        checkAuctionActive
        checkNotSoldOut
        checkCallerAccess
    {
        // Calculate the amount of items that can still be bought
        amount = Utils.min(amount, _getRemainingItems(itemsId));

        // Get the credited amount of items of the buyer and calculate how many items
        // must be paid for. Then consume the used amount of credit
        uint256 creditAmount = getCredit(_msgSender(), itemsId);
        uint256 payableAmount = creditAmount < amount ? amount - creditAmount : 0;

        _consumeCredit(_msgSender(), itemsId, amount - payableAmount);
        _purchaseItems(itemsId, amount, publicKey);

        // While the tx was in flight the purchase price may have changed or the sender
        // may have sent more cash than needed. If so, refund the difference
        _chargePayment(payableAmount * purchasePrice);
    }

    // Delegates

    /**
        @notice Requests the total number of items that can still be sold for
        the given id

        @param id The id of the items to purchase

        @return The total number of items that can still be sold

        @dev The function must be overriden by the child contract and return the
        number of items that can still be sold for the given id.
     */
    function _getRemainingItems(uint256 id) internal virtual returns (uint256) {
        // Empty on purpose
    }

    /**
        @notice Delegate function to purchase the amount of items indicated in the call

        @param id The batchId of the items to purchase
        @param amount The amount of items to be purchased
        @param publicKey The public key of the buyer

        @dev The function must be overriden by the child contract and implement the
        purchase logic
     */
    function _purchaseItems(
        uint256 id,
        uint256 amount,
        string calldata publicKey
    ) internal virtual {
        // Empty on purpose
    }
}
