import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BatchData } from "../contracts/NFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionCurrentBatch = () => {
    const [currentBatch, setCurrentBatch] = useState([
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
    ]);

    const auction = useNFTAuction();

    const fetchCurrentBatch = useCallback(async () => {
        try {
            console.log(auction);
            const batchValues = await auction.currentBatch();
            const batch = new BatchData(batchValues);
            setCurrentBatch(batchValues);
        } catch {}
    }, [auction, setCurrentBatch]);

    useEffect(() => {
        fetchCurrentBatch().catch(err => console.error(`Failed to fetch NFT auction batch: ${err.stack}`));
        const refreshInterval = setInterval(fetchCurrentBatch, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchCurrentBatch]);

    return currentBatch;
};

export default useNFTAuctionCurrentBatch;
