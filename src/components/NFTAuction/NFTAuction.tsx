import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useNFTAuctionStartBatch from "../../hooks/useNFTAuctionStartBatch";
import useNFTAuctionEndBatch from "../../hooks/useNFTAuctionEndBatch";
import useNFTAuctionSetBid from "../../hooks/useNFTAuctionSetBid";
import useNFTAuctionCancelBid from "../../hooks/useNFTAuctionCancelBid";
import useNFTAuctionClaimRefund from "../../hooks/useNFTAuctionClaimRefund";
import useNFTAuctionCurrentBatch from "../../hooks/useNFTAuctionCurrentBatch";
import useNFTAuctionListBidders from "../../hooks/useNFTAuctionListBidders";
import useMockWETHIncreaseAllowance from "../../hooks/useMockWETHIncreaseAllowance";
import { formatUnits } from "ethers/lib/utils";
import Deployments from "../../deployments.json";
import { BigNumber } from "@ethersproject/bignumber";

const NFTAuction: React.FC<any> = props => {
    /**
     * Current Batch Info
     */
    const currentBatch = useNFTAuctionCurrentBatch();
    const { onListBidders } = useNFTAuctionListBidders(props);
    const currentBatchEndDateMs = Number(formatUnits(currentBatch[0], "wei")) * 1000;
    const currentBatchEndDate = new Date(currentBatchEndDateMs);

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

    return (
        <div className="main">
            <div className="container">
                <h1>NFT Auction</h1>
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
                        Num. Bidders: {formatUnits(currentBatch[5], "wei")}
                        <br />
                        <br />
                        <button type="button" className="btn btn-primary" onClick={onListBidders}>
                            List Bidders
                        </button>
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
                        <h2>Manage Bids</h2>
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
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Claim Refund</h2>
                        <button type="button" className="btn btn-primary" onClick={onClaimRefund}>
                            Claim Refund
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(NFTAuction);
