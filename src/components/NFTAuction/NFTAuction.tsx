import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useNFTAuctionStartBatch from "../../hooks/useNFTAuctionStartBatch";
import useNFTAuctionEndBatch from "../../hooks/useNFTAuctionEndBatch";
import useNFTAuctionSetBid from "../../hooks/useNFTAuctionSetBid";
import useNFTAuctionCancelBid from "../../hooks/useNFTAuctionCancelBid";
import useNFTAuctionClaimRefund from "../../hooks/useNFTAuctionClaimRefund";
import useNFTAuctionCurrentBatch from "../../hooks/useNFTAuctionCurrentBatch";
import useNFTAuctionListBidders from "../../hooks/useNFTAuctionListBidders";
import { formatUnits } from "ethers/lib/utils";

const NFTAuction: React.FC<any> = props => {
    let currentBatch = useNFTAuctionCurrentBatch();

    return (
        <div className="main">
            <div className="container">
                <h1>NFT Auction</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Current Batch</h2>
                        End Date: {formatUnits(currentBatch[0])}
                        <br />
                        Minimum Price: {formatUnits(currentBatch[1])}
                        <br />
                        Start Token ID: {formatUnits(currentBatch[2])}
                        <br />
                        Num. Tokens Auctioned: {formatUnits(currentBatch[3])}
                        <br />
                        Highest Bid: {formatUnits(currentBatch[4])}
                        <br />
                        Num. Bidders: {formatUnits(currentBatch[5])}
                        <br />
                        <br />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(NFTAuction);
