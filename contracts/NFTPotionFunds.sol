// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Handles the funds received from the caller and makes sure that enough
    cash is sent for a specific payment.

    The owner can use transferFunds to send the funds to a recipient

    It also takes care of unrequested cash sent by rejecting them with an error
    message.
 */

contract NFTPotionFunds is Ownable {
    /**
        @notice Transfer the claimable funds to the recipient

        @param recipient The address to transfer the funds to

        @dev Owner only. Claimable funds come from succesful auctions
    */
    function transferFunds(address payable recipient) external onlyOwner {
        Address.sendValue(recipient, address(this).balance);
    }

    /**
        Added explicetely to avoid receiving cash by mistake
    */
    receive() external payable {
        revert("NFTPotionFunds: Unrequested funds received");
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
