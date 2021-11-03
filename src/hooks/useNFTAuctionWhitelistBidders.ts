import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionWhitelistBidders = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleWhitelistBidders = useCallback(
        async (addresses: string, numTokensList: string, firstTokenIdList: string) => {
            handleTransaction(
                auction.whitelistBidders(
                    JSON.parse(addresses),
                    JSON.parse(numTokensList),
                    JSON.parse(firstTokenIdList),
                ),
            );
        },
        [auction, handleTransaction],
    );
    return { onWhitelistBidders: handleWhitelistBidders };
};

export default useNFTAuctionWhitelistBidders;
