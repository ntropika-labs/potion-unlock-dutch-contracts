// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Address.sol";
import "./NFTPotionCredit.sol";
import "./NFTPotionKYC.sol";
import "./RarityConfigItem.sol";

contract NFTPotionDutchAuction is NFTPotionKYC, NFTPotionCredit {
    // Dutch auction
    uint256 public purchasePrice;
    uint256 public numAuctionedItems;
    uint256 public numSoldItems;
    bool public isAuctionActive;

    modifier checkAuctionActive() {
        require(isAuctionActive, "Auction is not active");
        _;
    }
    modifier checkNotSoldOut() {
        require(numSoldItems < numAuctionedItems, "Auction is sold out");
        _;
    }

    // Constructor
    constructor() {}

    // Auction management

    /**
        @notice Starts a new auction starting at the given price, for the given number of items.

        @param _purchasePrice The starting price of the tokens.
    */
    function startAuction(uint256 _purchasePrice, uint256 _numAuctionedItems) external onlyOwner {
        require(!isAuctionActive, "Auction is already active");
        require(numAuctionedItems > 0, "Number of auctioned tokens must be greater than 0");

        purchasePrice = _purchasePrice;
        numAuctionedItems = _numAuctionedItems;
        numSoldItems = 0;
        isAuctionActive = true;
    }

    /**
        @notice Stops the auction
     */
    function stopAuction() external onlyOwner {
        isAuctionActive = false;
    }

    /**
        @notice Mints a batch of tokenIDs

        @param amount The amount of assets to buy
        @param publicKey The public key of the buyer
     */
    function purchase(uint256 amount, string calldata publicKey)
        external
        payable
        checkAuctionActive
        checkNotSoldOut
        onlyKnownCustomer
    {
        // Get the credited amount of items of the buyer and calculate how many items must be paid for.
        // Then consume the used amount of credit
        uint256 creditAmount = getCredit(_msgSender());
        uint256 payableAmount = creditAmount < amount ? amount - creditAmount : 0;

        consumeCredit(_msgSender(), amount - payableAmount);

        // Calculate the total price for all the items and validate that enough cash was sent
        uint256 toPay = payableAmount * purchasePrice;
        require(msg.value >= toPay, "Didn't send enough cash for purchase");

        // While the tx was in flight the purchase price may have changed or the sender
        // may have sent more cash than needed. If so, refund the difference
        if (msg.value > toPay) {
            Address.sendValue(payable(_msgSender()), msg.value - toPay);
        }

        // Finally purchase the items
        _purchaseItems(amount, publicKey);
    }

    // Funds

    /**
        @notice Transfer the claimable funds to the recipient

        @param recipient The address to transfer the funds to

        @dev Owner only. Claimable funds come from succesful auctions
    */
    function transferFunds(address payable recipient) external onlyOwner {
        Address.sendValue(recipient, address(this).balance);
    }

    // Delegate

    /**
        @notice Delegate function to purchase the amount of items indicated in the call

        @param amount The amount of items to be purchased
        @param publicKey The public key of the buyer

        @dev The function must be overriden by the child contract and implement the
        purchase logic
     */
    function _purchaseItems(uint256 amount, string calldata publicKey) internal virtual {
        // Empty on purpose
    }
}
