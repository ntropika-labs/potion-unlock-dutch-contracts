import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionGetLatestBid = (props: any) => {
    const [valid, setValid] = useState<boolean>(false);
    const [numTokens, setNumTokens] = useState<BigNumber>(BigNumber.from(0));
    const [pricePerToken, setPricePerToken] = useState<BigNumber>(BigNumber.from(0));
    const auction = useNFTAuction();

    const fetchLatestBid = useCallback(async () => {
        const [validBid, numTokensBid, pricePerTokenBid] = await auction.getLatestBid();
        setValid(validBid);
        setNumTokens(numTokensBid);
        setPricePerToken(pricePerTokenBid);
    }, [auction, setNumTokens, setPricePerToken]);

    useEffect(() => {
        fetchLatestBid().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchLatestBid, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchLatestBid]);

    return { valid, numTokens, pricePerToken };
};

export default useNFTAuctionGetLatestBid;
