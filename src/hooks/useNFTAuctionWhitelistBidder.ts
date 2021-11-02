import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionWhitelistBidder = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleWhitelistBidder = useCallback(
        async (address: string, numTokensList: string, firstTokenIdList: string) => {
            handleTransaction(
                auction.whitelistBidder(address, JSON.parse(numTokensList), JSON.parse(firstTokenIdList)),
            );
        },
        [auction, handleTransaction],
    );
    return { onWhitelistBidder: handleWhitelistBidder };
};

export default useNFTAuctionWhitelistBidder;
