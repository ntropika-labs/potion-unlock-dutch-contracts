import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionEndBatch = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleEndBatch = useCallback(async () => {
        handleTransaction(auction.endBatch(100));
    }, [auction, handleTransaction]);
    return { onEndBatch: handleEndBatch };
};

export default useNFTAuctionEndBatch;
