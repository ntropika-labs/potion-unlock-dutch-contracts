import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionGetLatestBid = (props: any) => {
    const [numTokens, setNumTokens] = useState<BigNumber>(BigNumber.from(0));
    const [pricePerToken, setPricePerToken] = useState<BigNumber>(BigNumber.from(0));
    const auction = useNFTAuction();

    const fetchLatestBid = useCallback(async () => {
        const [numTokensBid, pricePerTokenBid] = await auction.getLatestBid();
        setNumTokens(numTokensBid);
        setPricePerToken(pricePerTokenBid);
    }, [auction, setNumTokens, setPricePerToken]);

    useEffect(() => {
        fetchLatestBid().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchLatestBid, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchLatestBid]);

    return { numTokens, pricePerToken };
};

export default useNFTAuctionGetLatestBid;
