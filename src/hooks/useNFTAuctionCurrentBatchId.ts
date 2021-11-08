import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionCurrentBatchId = (batchId: number) => {
    const [currentBatchId, setCurrentBatchId] = useState(BigNumber.from(0));

    const auction = useNFTAuction();

    const fetchCurrentBatchId = useCallback(async () => {
        try {
            setCurrentBatchId(await auction.currentBatchId());
        } catch {}
    }, [auction, setCurrentBatchId]);

    useEffect(() => {
        fetchCurrentBatchId().catch(err => console.error(`Failed to fetch NFT auction batch: ${err.stack}`));
        const refreshInterval = setInterval(fetchCurrentBatchId, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchCurrentBatchId]);

    return currentBatchId;
};

export default useNFTAuctionCurrentBatchId;
