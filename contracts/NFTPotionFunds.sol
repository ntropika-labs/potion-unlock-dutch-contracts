// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    Manual Dutch Auction to sell items at a changing price

    @dev This contract is used to sell items at a changing price. The price changes are done manually through
    the changePrice function. In principle the price should be lowered over time, but this is not implemented
    and it is the responsability of the user to do it.

    @dev The batchId parameter passed in the contract is an identifier that will be passed to the _purchaseItems
    function to help the child contract identify which batch of items the user wants to purchase. If there are no
    batches, the batchId can be any value and can be ignored when overriding the _purchaseItems function.
 */

contract NFTPotionFunds is Ownable {
    // Used to track unrequested cash received in the receive() function
    uint256 public unrequestedFundsReceived;

    /**
        @notice Transfer the claimable funds to the recipient

        @param recipient The address to transfer the funds to

        @dev Owner only. Claimable funds come from succesful auctions
    */
    function transferFunds(address payable recipient) external onlyOwner {
        Address.sendValue(recipient, address(this).balance);

        unrequestedFundsReceived = 0;
    }

    /**
        Added to track unrequested sending of cash to the contract
    */
    receive() external payable {
        unrequestedFundsReceived += msg.value;
    }

    // Internal functions

    /**
        @notice Requires that the sent cash is not less than the amount to pay
        and refunds the sender the difference

        @param amountToPay The amount that the caller should have at least sent
        
        @dev This function is performing an external call and should be called
        after all the checks and effects
     */
    function _chargePayment(uint256 amountToPay) internal {
        require(msg.value >= amountToPay, "Didn't send enough cash for payment");

        if (msg.value > amountToPay) {
            Address.sendValue(payable(_msgSender()), msg.value - amountToPay);
        }
    }
}
