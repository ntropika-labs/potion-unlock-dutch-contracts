import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionCancelBid = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleCancelBid = useCallback(async () => {
        handleTransaction(auction.cancelBid());
    }, [auction, handleTransaction]);
    return { onCancelBid: handleCancelBid };
};

export default useNFTAuctionCancelBid;
