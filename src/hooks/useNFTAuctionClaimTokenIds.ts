import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionClaimTokenIds = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleClaimTokenIds = useCallback(
        async (batchId: number, alsoRefund: boolean) => {
            handleTransaction(auction.claimTokenIds(batchId, alsoRefund));
        },
        [auction, handleTransaction],
    );
    return { onClaimTokenIds: handleClaimTokenIds };
};

export default useNFTAuctionClaimTokenIds;
