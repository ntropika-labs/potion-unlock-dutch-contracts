import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionBatchInfo = (batchId: number) => {
    const [batchInfo, setBatchInfo] = useState([
        BigNumber.from(0),
        BigNumber.from(0),
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
            const batchValues = await auction.getBatch(batchId);
            setBatchInfo(batchValues);
        } catch {}
    }, [auction, batchId, setBatchInfo]);

    useEffect(() => {
        fetchCurrentBatch().catch(err => console.error(`Failed to fetch NFT auction batch: ${err.stack}`));
        const refreshInterval = setInterval(fetchCurrentBatch, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchCurrentBatch]);

    return batchInfo;
};

export default useNFTAuctionBatchInfo;
