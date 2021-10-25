import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionListBidders = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleListBidders = useCallback(async () => {
        handleTransaction(auction.listBidders());
    }, [auction, handleTransaction]);
    return { onListBidders: handleListBidders };
};

export default useNFTAuctionListBidders;
