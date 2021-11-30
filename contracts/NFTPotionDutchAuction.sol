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
    uint256 public currentId;
    uint256 public purchasePrice;
    bool public isAuctionActive;

    // Events
    event AuctionStarted(uint256 id, uint256 startPrice);
    event AuctionStopped(uint256 id);
    event AuctionPriceChanged(uint256 id, uint256 newPrice);

    // Modifiers
    modifier checkAuctionActive(uint256 id) {
        require(isAuctionActive, "Auction is not active");
        require(id == currentId, "Active auction ID mismatch");
        _;
    }
    modifier checkAuctionNotSoldOut(uint256 id) {
        require(getRemainingItems(id) > 0, "Items are already sold out");
        _;
    }

    // Auction management

    /**
        @notice Starts a new auction starting at the given price, for the given number of items.

        @param id The identifier of the items to be auctioned
        @param startPrice The starting price of the tokens.
    */
    function startAuction(uint256 id, uint256 startPrice) external onlyOwner checkAuctionNotSoldOut(id) {
        require(!isAuctionActive, "Auction is already active");

        currentId = id;
        purchasePrice = startPrice;
        isAuctionActive = true;

        emit AuctionStarted(id, startPrice);
    }

    /**
        @notice Stops the auction
     */
    function stopAuction() external onlyOwner {
        isAuctionActive = false;

        emit AuctionStopped(currentId);
    }

    /**
        @notice Changes the purchase price of the auction

        @param newPrice The new purchase price
     */
    function changePrice(uint256 id, uint256 newPrice) external onlyOwner checkAuctionActive(id) {
        purchasePrice = newPrice;

        emit AuctionPriceChanged(id, newPrice);
    }

    /**
        @notice Mints a batch of tokenIDs

        @param id The identifier of the items set being auctioned
        @param amount The amount of assets to buy
        @param limitPrice The maximum price the buyer is willing to pay
        @param publicKey The public key of the buyer

        @dev The auction id is sent in case the auction ends an another auction starts while
        the tx is in flight. This ensures that the purchase happens for the intended batch.

        @dev limitPrice is used to ensure that the buyer is not overpaying, in case the purchase price
        goes up, or that the auction ends and a new start is started while the tx is in flight.

        @dev The function ensures that no more than the maximum number of items will be purchased,
        so the implementer of the delegator function does not need to check for this.
     */
    function purchase(
        uint256 id,
        uint256 amount,
        uint256 limitPrice,
        string calldata publicKey
    ) external payable checkAuctionActive(id) checkCallerAccess checkAuctionNotSoldOut(id) {
        require(purchasePrice <= limitPrice, "Current price is higher than limit price");

        // Calculate the amount of items that can still be bought
        amount = Utils.min(amount, getRemainingItems(id));

        // Get the credited amount of items of the buyer and calculate how many items
        // must be paid for. Then consume the used amount of credit
        uint256 creditAmount = getCredit(_msgSender(), id);
        uint256 payableAmount = creditAmount < amount ? amount - creditAmount : 0;

        _consumeCredit(_msgSender(), id, amount - payableAmount);
        _purchaseItems(id, amount, limitPrice, publicKey);

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
    function getRemainingItems(uint256 id) public virtual returns (uint256) {
        // Empty on purpose
    }

    /**
        @notice Delegate function to purchase the amount of items indicated in the call

        @param id The batchId of the items to purchase
        @param amount The amount of items to be purchased
        @param limitPrice The maximum price the buyer is willing to pay
        @param publicKey The public key of the buyer

        @dev The function must be overriden by the child contract and implement the
        purchase logic
     */
    function _purchaseItems(
        uint256 id,
        uint256 amount,
        uint256 limitPrice,
        string calldata publicKey
    ) internal virtual {
        // Empty on purpose
    }
}
