// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @notice Handles the funds received from the caller and makes sure that enough
    cash is sent for a specific payment.

    The owner can use transferFunds to send the funds to a recipient

    It also takes care of unrequested cash sent by rejecting them with an error
    message.
 */

contract NFTPotionERC20Funds is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public paymentToken;

    // Constructor
    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
    }

    /**
        @notice Transfer the claimable funds to the recipient

        @param recipient The address to transfer the funds to

        @dev Owner only
    */
    function transferFunds(address recipient, uint256 amount) external onlyOwner {
        paymentToken.safeTransfer(recipient, amount);
    }

    /**
        Added explicitely to avoid receiving cash by mistake
    */
    receive() external payable {
        revert("NFTPotionFunds: Unrequested funds received");
    }

    // Internal functions

    /**
        @notice Takes care of transferring the required amount from the caller
        to the contract

        @param amountToPay The amount that will be transferred to the contract
        
        @dev This function is performing an external call and should be called
        after all the checks and effects
     */
    function _chargePayment(uint256 amountToPay) internal {
        paymentToken.safeTransferFrom(_msgSender(), address(this), amountToPay);
    }
}
