// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./INFTPotionWhitelistExternal.sol";

contract NFTGnosisProxy is IERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals = 0;

    address private _owner;
    address private _easyAuctionContract;
    INFTPotionWhitelistExternal private _whitelistManager;

    uint128 public _startTokenId;
    uint128 public _endTokenId;
    uint128 public _numTokensAssigned;

    modifier onlyOwner() {
        require(msg.sender == _owner, "Only owner can perform this action");
        _;
    }
    modifier onlyAuction() {
        require(msg.sender == _easyAuctionContract, "Only auction can perform this action");
        _;
    }

    constructor(
        string memory __name,
        string memory __symbol,
        uint128 startTokenId,
        uint128 endTokenId,
        address whitelistManager,
        address easyAuctionContract
    ) {
        _name = __name;
        _symbol = __symbol;

        _owner = msg.sender;
        _whitelistManager = INFTPotionWhitelistExternal(whitelistManager);
        _easyAuctionContract = easyAuctionContract;
        _startTokenId = startTokenId;
        _endTokenId = endTokenId;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view returns (uint256) {
        return _endTokenId - _startTokenId + 1;
    }

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256) {
        if (account == _owner) {
            return totalSupply();
        } else {
            return 0;
        }
    }

    function transfer(address recipient, uint256 amount) external onlyAuction returns (bool) {
        if (recipient == _owner) {
            return true;
        }

        require(_startTokenId + _numTokensAssigned <= _endTokenId, "Not enough tokens to assign");

        _whitelistManager.whitelistOne(recipient, _startTokenId + _numTokensAssigned, uint128(amount));

        _numTokensAssigned += uint128(amount);

        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        if (_owner == owner && spender == _easyAuctionContract) {
            return totalSupply();
        } else {
            return 0;
        }
    }

    function approve(
        address, /*spender*/
        uint256 /*amount*/
    ) external view onlyOwner returns (bool) {
        return true;
    }

    function transferFrom(
        address, /*sender*/
        address, /*recipient*/
        uint256 /*amount*/
    ) external view onlyAuction returns (bool) {
        return true;
    }
}
