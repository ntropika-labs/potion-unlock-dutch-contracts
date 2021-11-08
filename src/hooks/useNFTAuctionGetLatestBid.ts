import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionGetLatestBid = (batchId: number, props: any) => {
    const [bidder, setBidder] = useState<string>();
    const [bidId, setBidId] = useState<BigNumber>(BigNumber.from(0));
    const [numTokens, setNumTokens] = useState<BigNumber>(BigNumber.from(0));
    const [pricePerToken, setPricePerToken] = useState<BigNumber>(BigNumber.from(0));
    const auction = useNFTAuction();

    const fetchLatestBid = useCallback(async () => {
        const [bidder, bidId, numTokensBid, pricePerTokenBid] = await auction.getLatestBid(batchId);
        setBidder(bidder);
        setBidId(bidId);
        setNumTokens(numTokensBid);
        setPricePerToken(pricePerTokenBid);
    }, [auction, batchId, setNumTokens, setPricePerToken]);

    useEffect(() => {
        fetchLatestBid().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchLatestBid, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchLatestBid]);

    return { bidder, bidId, numTokens, pricePerToken };
};

export default useNFTAuctionGetLatestBid;
