import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

interface Range {
    firstId: BigNumber;
    lastId: BigNumber;
}

const useNFTAuctionGetWhitelistRanges = (props: any) => {
    const [tokenIdRanges, setTokenIdRanges] = useState<Range[]>();
    const auction = useNFTAuction();

    const fetchWhitelistRanges = useCallback(async () => {
        const ranges = await auction.getWhitelistRanges();
        setTokenIdRanges(ranges);
    }, [auction, setTokenIdRanges]);

    useEffect(() => {
        fetchWhitelistRanges().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchWhitelistRanges, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchWhitelistRanges]);

    return tokenIdRanges;
};

export default useNFTAuctionGetWhitelistRanges;
