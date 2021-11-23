// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./INFTPotionWhitelistExternal.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
    @notice Handles whitelisting of ranges for the auction bidders

    @dev The ranges are stored in a map, where the key is the bidder's address and the value
    is an array of ranges for that bidder. See INFTPotionWhitelist.sol for more details.
 */
contract NFTPotionWhitelist is AccessControl, INFTPotionWhitelistExternal {
    // Role-based access control, operator can whitelist one address at a time
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Whitelist
    mapping(address => WhitelistData[]) public whitelist;

    // Events
    event Whitelist(address indexed bidder);

    // Modifiers
    modifier onlyOwnerOrOperator() {
        require(
            hasRole(OPERATOR_ROLE, _msgSender()) || hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Caller is not the owner or an operator"
        );
        _;
    }

    /**
        @notice Deployer get the default admin role
     */
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
        @dev See INFTPotionWhitelist.sol
     */
    function getWhitelistRanges(address bidder) external view returns (WhitelistData[] memory) {
        return whitelist[bidder];
    }

    function addOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OPERATOR_ROLE, operator);
    }

    /**
        @notice Whitelists a list of bidders for the given amounts starting at startId

        @param bidders List of bidders to whitelist
        @param startIds List of token IDs where each bidder's whitelist range will start at
        @param amounts List of amounts of IDs to be whitelisted

        @dev The ranges must be contiguous and no gaps are allowed. If more than one range is to be given
        to the same bidder, the bidder address can be repeated in the bidders list
    */
    function whitelistMany(
        address[] calldata bidders,
        uint128[] calldata startIds,
        uint128[] calldata amounts
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bidders.length > 0, "Trying to whitelist with empty array"); // TODO: add unit test
        require(bidders.length == startIds.length, "Mismatch in array sizes for direct whitelist");
        require(bidders.length == amounts.length, "Mismatch in array sizes for direct whitelist");

        uint128 startId = startIds[0];

        for (uint256 i = 0; i < amounts.length; ++i) {
            require(startIds[i] == startId, "Cannot have gaps or overlaps when whitelisting");
            startId += amounts[i];

            whitelistOne(bidders[i], startIds[i], amounts[i]);
        }
    }

    /**
        @notice Whitelists a bidder for the given amount starting at nextFreeTokenId

        @param bidder The bidder to whitelist
        @param startId The starting ID for the range
        @param amount The amount of IDs to be whitelisted
    */
    function whitelistOne(
        address bidder,
        uint128 startId,
        uint128 amount
    ) public onlyOwnerOrOperator {
        WhitelistData memory whitelistData;

        whitelistData.firstId = startId;
        whitelistData.lastId = startId + amount - 1;
        whitelist[bidder].push(whitelistData);

        emit Whitelist(bidder);
    }
}
