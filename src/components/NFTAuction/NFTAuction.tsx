import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useNFTAuctionStartBatch from "../../hooks/useNFTAuctionStartBatch";
import useNFTAuctionEndBatch from "../../hooks/useNFTAuctionEndBatch";
import useNFTAuctionSetBid from "../../hooks/useNFTAuctionSetBid";
import useNFTAuctionCancelBid from "../../hooks/useNFTAuctionCancelBid";
import useNFTAuctionPurchase from "../../hooks/useNFTAuctionPurchase";
import useNFTAuctionClaimRefund from "../../hooks/useNFTAuctionClaimRefund";
import useNFTAuctionBatchInfo from "../../hooks/useNFTAuctionBatchInfo";
import useNFTAuctionGetLatestBid from "../../hooks/useNFTAuctionGetLatestBid";
import useNFTAuctionGetWhitelistRanges from "../../hooks/useNFTAuctionGetWhitelistRanges";
import useNFTAuctionClaimableFunds from "../../hooks/useNFTAuctionClaimableFunds";
import useNFTAuctionTransferFunds from "../../hooks/useNFTAuctionTransferFunds";
import useNFTAuctionRefundAmount from "../../hooks/useNFTAuctionRefundAmount";
import useNFTAuctionGetAllBids from "../../hooks/useNFTAuctionGetAllBids";
import useNFTAuctionWhitelistBidders from "../../hooks/useNFTAuctionWhitelistBidders";
import useNFTAuctionEtherBalance from "../../hooks/useNFTAuctionEtherBalance";
import useNFTAuctionCurrentBatchId from "../../hooks/useNFTAuctionCurrentBatchId";
import useNFTAuctionClaimTokenIds from "../../hooks/useNFTAuctionClaimTokenIds";
import useNFTMintingList from "../../hooks/useNFTMintingList";
import { formatUnits } from "ethers/lib/utils";
import { BigNumber } from "@ethersproject/bignumber";

const NFTAuction: React.FC<any> = props => {
    /**
     * Current Batch Info
     */
    const [batchId, setBatchId] = useState<number>(1);
    const currentBatchId = useNFTAuctionCurrentBatchId(props);
    const batchInfo = useNFTAuctionBatchInfo(batchId);
    const currentBatchEndDateMs = Number(formatUnits(batchInfo[4], "wei")) * 1000;
    const currentBatchEndDate = new Date(currentBatchEndDateMs);
    const lockedFunds = useNFTAuctionEtherBalance(props);
    const claimableFunds = useNFTAuctionClaimableFunds(props);
    const { onTransferFunds } = useNFTAuctionTransferFunds(props);

    const [recipient, setRecipient] = useState<string>();
    const handleRecipientChange = useCallback(
        event => {
            setRecipient(event.target.value);
        },
        [setRecipient],
    );
    const handleTransferFunds = useCallback(() => {
        onTransferFunds(recipient);
    }, [recipient, onTransferFunds]);

    const bids = useNFTAuctionGetAllBids(props);

    /**
     * Start batch
     */
    const { onStartBatch } = useNFTAuctionStartBatch(props);
    const [endDate, setEndDate] = useState<number>();
    const [minimumPrice, setMinimumPrice] = useState<string>();
    const [purchasePrice, setPurchasePrice] = useState<string>();
    const [startTokenId, setStartTokenId] = useState<number>();
    const [endTokenId, setEndTokenId] = useState<number>();

    const handleEndDateChange = useCallback(
        event => {
            setEndDate(event.target.value);
        },
        [setEndDate],
    );
    const handleMinimumPriceChange = useCallback(
        event => {
            setMinimumPrice(event.target.value);
        },
        [setMinimumPrice],
    );
    const handlePurchasePriceChange = useCallback(
        event => {
            setPurchasePrice(event.target.value);
        },
        [setPurchasePrice],
    );
    const handleStartTokenIdChange = useCallback(
        event => {
            setStartTokenId(event.target.value);
        },
        [setStartTokenId],
    );
    const handleEndTokenIdChange = useCallback(
        event => {
            setEndTokenId(event.target.value);
        },
        [setEndTokenId],
    );
    const handleStartAuction = useCallback(() => {
        onStartBatch(startTokenId, endTokenId, minimumPrice, purchasePrice, endDate);
    }, [startTokenId, endTokenId, minimumPrice, purchasePrice, endDate, onStartBatch]);

    /**
     * End batch
     */
    const { onEndBatch } = useNFTAuctionEndBatch(props);

    /**
     * Bidding management
     */
    const { onSetBid } = useNFTAuctionSetBid(props);
    const { onCancelBid } = useNFTAuctionCancelBid(props);
    const { onPurchase } = useNFTAuctionPurchase(props);
    const { bidder, bidId, numTokens, pricePerToken } = useNFTAuctionGetLatestBid(batchId, props);

    const [bid, setBid] = useState<string>();
    const [bidNumTokens, setBidNumTokens] = useState<string>();

    const handleBatchIdChange = useCallback(
        event => {
            if (event.target.value !== "") {
                setBatchId(event.target.value);
            }
        },
        [setBatchId],
    );
    const handleBidChange = useCallback(
        event => {
            setBid(event.target.value);
        },
        [setBid],
    );
    const handleBidNumTokenChange = useCallback(
        event => {
            setBidNumTokens(event.target.value);
        },
        [setBidNumTokens],
    );
    const handleSetBid = useCallback(() => {
        onSetBid(bidNumTokens, bid);
    }, [bidNumTokens, bid, onSetBid]);

    const handlePurchase = useCallback(() => {
        onPurchase(bidNumTokens, bid);
    }, [bidNumTokens, bid, onPurchase]);

    const handleCancelBidRefund = useCallback(() => {
        onCancelBid(batchId, true);
    }, [batchId, onCancelBid]);
    const handleCancelBidNoRefund = useCallback(() => {
        onCancelBid(batchId, false);
    }, [batchId, onCancelBid]);

    /**
     * Refunds management
     */
    const { onClaimRefund } = useNFTAuctionClaimRefund(props);
    const refundAmount = useNFTAuctionRefundAmount(props);

    /**
     * Token whitelisting
     */
    const { onClaimTokenIds } = useNFTAuctionClaimTokenIds(props);
    const tokenIdRanges = useNFTAuctionGetWhitelistRanges(props);

    const handleClaimTokenIdsRefund = useCallback(
        event => {
            onClaimTokenIds(batchId, true);
        },
        [onClaimTokenIds, batchId],
    );
    const handleClaimTokenIdsNoRefund = useCallback(
        event => {
            onClaimTokenIds(batchId, false);
        },
        [onClaimTokenIds, batchId],
    );

    const { onWhitelistBidders } = useNFTAuctionWhitelistBidders(props);
    const [whitelistAddresses, setwhitelistAddresses] = useState<string>();
    const [whitelistNumTokens, setWhitelistNumTokens] = useState<string>();
    const [whitelistFirstTokenID, setwhitelistFirstTokenID] = useState<string>();
    const handleWhitelistAddressChange = useCallback(
        event => {
            setwhitelistAddresses(event.target.value);
        },
        [setwhitelistAddresses],
    );
    const handleWhitelistNumTokensChange = useCallback(
        event => {
            setWhitelistNumTokens(event.target.value);
        },
        [setWhitelistNumTokens],
    );
    const handleWhitelistFirstTokenIdChange = useCallback(
        event => {
            setwhitelistFirstTokenID(event.target.value);
        },
        [setwhitelistFirstTokenID],
    );

    const handleWhitelistBidder = useCallback(() => {
        onWhitelistBidders(whitelistAddresses, whitelistNumTokens, whitelistFirstTokenID);
    }, [whitelistAddresses, whitelistNumTokens, whitelistFirstTokenID, onWhitelistBidders]);

    const [showBids, setShowBids] = useState<boolean>(false);
    const handleShowBids = useCallback(() => {
        setShowBids(!showBids);
    }, [showBids, setShowBids]);

    /**
     * Token minting
     */
    const [mintStartID, setMintStartID] = useState<number>();
    const handleMintStartID = useCallback(
        event => {
            setMintStartID(event.target.value);
        },
        [setMintStartID],
    );

    const [mintEndID, setMintEndID] = useState<number>();
    const handleMintEndID = useCallback(
        event => {
            setMintEndID(event.target.value);
        },
        [setMintEndID],
    );

    const { onMintingList } = useNFTMintingList(props);
    const handleMintingList = useCallback(() => {
        onMintingList([{ firstId: BigNumber.from(mintStartID), lastId: BigNumber.from(mintEndID) }]);
    }, [mintStartID, mintEndID, onMintingList]);

    const handleMintingAll = useCallback(() => {
        onMintingList(tokenIdRanges);
    }, [tokenIdRanges, onMintingList]);

    return (
        <div className="main">
            <div className="container">
                <h1>NFT Auction management</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Batch Info</h2>
                        <br />
                        Current Batch Id: {formatUnits(currentBatchId, "wei")}
                        <br />
                        <label htmlFor="batchId">Batch ID</label>
                        <input type="number" className="form-control" id="batchId" onChange={handleBatchIdChange} />
                        <br />
                        Batch Id: {formatUnits(batchInfo[7], "wei")}
                        <br />
                        End Date: {currentBatchEndDate.toLocaleString()}
                        <br />
                        Minimum Price: {formatUnits(batchInfo[0])}
                        <br />
                        Direct Purchase Price: {formatUnits(batchInfo[1])}
                        <br />
                        Start Token ID: {formatUnits(batchInfo[2], "wei")}
                        <br />
                        Num. Tokens Auctioned: {formatUnits(batchInfo[3], "wei")}
                        <br />
                        Clearing Price: {formatUnits(batchInfo[5])}
                        <br />
                        Last Bidder Num. Tokens: {formatUnits(batchInfo[6], "wei")}
                        <br />
                        <br />
                        Current Bids:
                        <button type="button" className="btn btn-primary" onClick={handleShowBids}>
                            Show Bids
                        </button>
                        {showBids && (
                            <pre>
                                <code>{bids}</code>
                            </pre>
                        )}
                        <br />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Manage Batch</h2>
                        <div className="form-group">
                            <label htmlFor="endDate">End Date</label>
                            <input type="string" className="form-control" id="endDate" onChange={handleEndDateChange} />
                            <br />
                            <label htmlFor="minimumPrice">Minimum Price</label>
                            <input
                                type="string"
                                className="form-control"
                                id="minimumPrice"
                                onChange={handleMinimumPriceChange}
                            />
                            <br />
                            <label htmlFor="purchasePrice">Purchase Price</label>
                            <input
                                type="string"
                                className="form-control"
                                id="purchasePrice"
                                onChange={handlePurchasePriceChange}
                            />
                            <br />
                            <label htmlFor="startTokenId">Start Token ID</label>
                            <input
                                type="string"
                                className="form-control"
                                id="startTokenId"
                                onChange={handleStartTokenIdChange}
                            />
                            <br />
                            <label htmlFor="endTokenId">End Token ID</label>
                            <input
                                type="string"
                                className="form-control"
                                id="endTokenId"
                                onChange={handleEndTokenIdChange}
                            />
                            <br />
                            <br />
                            <button type="button" className="btn btn-primary" onClick={handleStartAuction}>
                                Start Auction
                            </button>
                            <button type="button" className="btn btn-primary" onClick={onEndBatch}>
                                End Auction
                            </button>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Funds</h2>
                        Current Locked Funds: {formatUnits(lockedFunds)}
                        <br />
                        Claimable Funds: {formatUnits(claimableFunds)}
                        <br />
                        <label htmlFor="recipient">Recipient</label>
                        <input type="string" className="form-control" id="recipient" onChange={handleRecipientChange} />
                        <br />
                        <button type="button" className="btn btn-primary" onClick={handleTransferFunds}>
                            Transfer Funds
                        </button>
                    </div>
                </div>
                <h1>NFT User Actions</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Manage Bids</h2>
                        <div className="row">
                            <div className="col-sm-12">
                                <h3>Latest Bid</h3>
                                Bidder: {bidder}
                                <br />
                                ID: {formatUnits(bidId, "wei")}
                                <br />
                                Num. Tokens: {formatUnits(numTokens, "wei")}
                                <br />
                                Price per Token: {formatUnits(pricePerToken)}
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-12">
                                <h3>New Bid</h3>
                                <div className="form-group">
                                    <label htmlFor="bid">Bid per Token</label>
                                    <input type="string" className="form-control" id="bid" onChange={handleBidChange} />
                                    <br />
                                    <label htmlFor="bidNumTokens">Number of Tokens</label>
                                    <input
                                        type="string"
                                        className="form-control"
                                        id="bidNumTokens"
                                        onChange={handleBidNumTokenChange}
                                    />
                                    <br />
                                    <button type="button" className="btn btn-primary" onClick={handleSetBid}>
                                        Set Bid
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handlePurchase}>
                                        Purchase
                                    </button>
                                    <br />
                                    <button type="button" className="btn btn-primary" onClick={handleCancelBidRefund}>
                                        Cancel Bid with Refund
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={handleCancelBidNoRefund}>
                                        Cancel Bid with NO Refund
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Claim Refund</h2>
                        Amount: {formatUnits(refundAmount)}
                        <br />
                        <button type="button" className="btn btn-primary" onClick={onClaimRefund}>
                            Claim Refund
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Whitelist Bidder</h2>
                        <label htmlFor="whitelistAddress">Bidder Address</label>
                        <input
                            type="string"
                            className="form-control"
                            id="whitelistAddress"
                            onChange={handleWhitelistAddressChange}
                        />
                        <br />
                        <label htmlFor="whitelistNumTokens">Num. Tokens List</label>
                        <input
                            type="string"
                            className="form-control"
                            id="whitelistNumTokens"
                            onChange={handleWhitelistNumTokensChange}
                        />
                        <br />
                        <label htmlFor="whitelistFirstTokenId">First Token ID List</label>
                        <input
                            type="string"
                            className="form-control"
                            id="whitelistFirstTokenId"
                            onChange={handleWhitelistFirstTokenIdChange}
                        />
                        <br />
                        <button type="button" className="btn btn-primary" onClick={handleWhitelistBidder}>
                            Whitelist Bidder
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Assigned Token IDs</h2>
                        <button type="button" className="btn btn-primary" onClick={handleClaimTokenIdsRefund}>
                            Claim Token IDs with Refund
                        </button>
                        <br />
                        <button type="button" className="btn btn-primary" onClick={handleClaimTokenIdsNoRefund}>
                            Claim Token IDs with NO Refund
                        </button>
                        <br />
                        <br />
                        {tokenIdRanges?.length === 0
                            ? "None"
                            : tokenIdRanges?.map(item => {
                                  return `[${formatUnits(item.firstId, "wei")}, ${formatUnits(item.lastId, "wei")}]`;
                              })}
                        <br />
                        <button type="button" className="btn btn-primary" onClick={handleMintingAll}>
                            Mint All Tokens
                        </button>
                    </div>
                    <br />
                    <div className="col-sm-12">
                        <label htmlFor="startTokenId">Start Token ID:</label>
                        <input type="number" className="form-control" id="startTokenId" onChange={handleMintStartID} />
                        <br />
                        <label htmlFor="endTokenId">End Token ID:</label>
                        <input type="number" className="form-control" id="endTokenId" onChange={handleMintEndID} />
                        <br />
                        <button type="button" className="btn btn-primary" onClick={handleMintingList}>
                            Mint Token Range
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(NFTAuction);
