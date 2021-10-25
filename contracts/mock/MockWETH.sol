// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {
    constructor(address[] memory recipients) ERC20("MockWETH", "WETH") {
        for (uint256 i = 0; i < recipients.length; ++i) {
            _mint(recipients[i], 1000 * (10**18));
        }
    }
}
