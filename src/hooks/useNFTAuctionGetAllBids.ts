import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { formatUnits } from "@ethersproject/units";

const useNFTAuctionGetAllBids = (props: any) => {
    const [bids, setBids] = useState<string>();
    const auction = useNFTAuction();

    const fetchAllBids = useCallback(async () => {
        let allBids = await auction.getAllBids();

        allBids = allBids.map((item: any) => {
            return {
                bidderAddress: item.bidderAddress,
                bidderId: formatUnits(item.bidderId, "wei"),
                numTokens: formatUnits(item.numTokens, "wei"),
                pricePerToken: formatUnits(item.pricePerToken),
            };
        });
        setBids(JSON.stringify(allBids, null, 2));
    }, [auction, setBids]);

    useEffect(() => {
        fetchAllBids().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchAllBids, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchAllBids]);

    return bids;
};

export default useNFTAuctionGetAllBids;
