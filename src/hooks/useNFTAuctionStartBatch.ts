import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionStartBatch = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleStartBatch = useCallback(
        async (
            startTokenId: number,
            endTokenId: number,
            minimumPricePerToken: string,
            purchasePrice: string,
            auctionEndDate: number,
        ) => {
            handleTransaction(
                auction.startBatch(startTokenId, endTokenId, minimumPricePerToken, purchasePrice, auctionEndDate),
            );
        },
        [auction, handleTransaction],
    );
    return { onStartBatch: handleStartBatch };
};

export default useNFTAuctionStartBatch;
