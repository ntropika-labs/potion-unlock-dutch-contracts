import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useNFTAuctionStartBatch from "../../hooks/useNFTAuctionStartBatch";
import useNFTAuctionEndBatch from "../../hooks/useNFTAuctionEndBatch";
import useNFTAuctionSetBid from "../../hooks/useNFTAuctionSetBid";
import useNFTAuctionCancelBid from "../../hooks/useNFTAuctionCancelBid";
import useNFTAuctionClaimRefund from "../../hooks/useNFTAuctionClaimRefund";
import useNFTAuctionCurrentBatch from "../../hooks/useNFTAuctionCurrentBatch";
import useNFTAuctionGetLatestBid from "../../hooks/useNFTAuctionGetLatestBid";
import useNFTAuctionGetWhitelistRanges from "../../hooks/useNFTAuctionGetWhitelistRanges";
import useNFTAuctionClaimableFunds from "../../hooks/useNFTAuctionClaimableFunds";
import useNFTAuctionTransferFunds from "../../hooks/useNFTAuctionTransferFunds";
import useNFTAuctionRefundAmount from "../../hooks/useNFTAuctionRefundAmount";
import useMockWETHIncreaseAllowance from "../../hooks/useMockWETHIncreaseAllowance";
import useNFTAuctionGetAllBids from "../../hooks/useNFTAuctionGetAllBids";
import useMockWETHBalanceOf from "../../hooks/useMockWETHBalanceOf";
import { formatUnits } from "ethers/lib/utils";
import Deployments from "../../deployments.json";
import { BigNumber } from "@ethersproject/bignumber";

const NFTAuction: React.FC<any> = props => {
    /**
     * Current Batch Info
     */
    const currentBatch = useNFTAuctionCurrentBatch();
    const currentBatchEndDateMs = Number(formatUnits(currentBatch[0], "wei")) * 1000;
    const currentBatchEndDate = new Date(currentBatchEndDateMs);
    const lockedFunds = useMockWETHBalanceOf(props, Deployments.NFTAuction);
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
        onStartBatch(startTokenId, endTokenId, minimumPrice, endDate);
    }, [startTokenId, endTokenId, minimumPrice, endDate, onStartBatch]);

    /**
     * End batch
     */
    const { onEndBatch } = useNFTAuctionEndBatch(props);

    /**
     * Bidding management
     */
    const { onSetBid } = useNFTAuctionSetBid(props);
    const { onCancelBid } = useNFTAuctionCancelBid(props);
    const { onIncreaseAllowance } = useMockWETHIncreaseAllowance(props);
    const { numTokens, pricePerToken } = useNFTAuctionGetLatestBid(props);

    const [bid, setBid] = useState<string>();
    const [bidNumTokens, setBidNumTokens] = useState<string>();

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

    const handleIncreaseAllowance = useCallback(() => {
        const allowance = BigNumber.from(bid).mul(BigNumber.from(bidNumTokens));
        onIncreaseAllowance(Deployments.NFTAuction, allowance);
    }, [bid, bidNumTokens, onIncreaseAllowance]);

    /**
     * Refunds management
     */
    const { onClaimRefund } = useNFTAuctionClaimRefund(props);
    const refundAmount = useNFTAuctionRefundAmount(props);

    const totalRefundsPending = lockedFunds.sub(claimableFunds).sub(currentBatch[5]);

    /**
     * Token whitelisting
     */
    const tokenIdRanges = useNFTAuctionGetWhitelistRanges(props);

    const [showBids, setShowBids] = useState<boolean>(false);
    const handleShowBids = useCallback(() => {
        setShowBids(!showBids);
    }, [showBids, setShowBids]);

    return (
        <div className="main">
            <div className="container">
                <h1>NFT Auction management</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Current Batch</h2>
                        End Date: {currentBatchEndDate.toLocaleString()}
                        <br />
                        Minimum Price: {formatUnits(currentBatch[1])}
                        <br />
                        Start Token ID: {formatUnits(currentBatch[2], "wei")}
                        <br />
                        Num. Tokens Auctioned: {formatUnits(currentBatch[3], "wei")}
                        <br />
                        Highest Bid: {formatUnits(currentBatch[4])}
                        <br />
                        Batch Claimable Funds: {formatUnits(currentBatch[5])}
                        <br />
                        Num. Bidders: {formatUnits(currentBatch[6], "wei")}
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
                        Overall Claimable Funds: {formatUnits(claimableFunds.add(currentBatch[5]))}
                        <br />
                        Total Refunds Pending: {formatUnits(totalRefundsPending)}
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
                                    <br />
                                    <button type="button" className="btn btn-primary" onClick={handleIncreaseAllowance}>
                                        Approve
                                    </button>
                                    <br />
                                    <button type="button" className="btn btn-primary" onClick={handleSetBid}>
                                        Set Bid
                                    </button>
                                    <br />
                                    <button type="button" className="btn btn-primary" onClick={onCancelBid}>
                                        Cancel Bid
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
                        <h2>Assigned Token IDs</h2>
                        {tokenIdRanges?.length === 0
                            ? "None"
                            : tokenIdRanges?.map(item => {
                                  return `[${formatUnits(item.firstId, "wei")}, ${formatUnits(item.lastId, "wei")}]`;
                              })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(NFTAuction);
