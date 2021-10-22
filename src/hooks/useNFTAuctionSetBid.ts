import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionSetBid = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleSetBid = useCallback(
        async (numTokens: string, pricePerToken: string) => {
            handleTransaction(auction.setBid(numTokens, pricePerToken));
        },
        [auction, handleTransaction],
    );
    return { onSetBid: handleSetBid };
};

export default useNFTAuctionSetBid;
