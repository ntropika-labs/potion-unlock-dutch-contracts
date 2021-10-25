import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionClaimRefund = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleClaimRefund = useCallback(async () => {
        handleTransaction(auction.claimRefund());
    }, [auction, handleTransaction]);
    return { onClaimRefund: handleClaimRefund };
};

export default useNFTAuctionClaimRefund;
