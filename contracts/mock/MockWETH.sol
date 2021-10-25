// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {
    constructor() ERC20("MockWETH", "WETH") {
        _mint(_msgSender(), 100 * (10**18));
    }
}
