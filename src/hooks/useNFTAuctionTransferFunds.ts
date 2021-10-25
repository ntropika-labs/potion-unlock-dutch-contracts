import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionTransferFunds = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handleTransferFunds = useCallback(
        async (recipient: string) => {
            handleTransaction(auction.transferFunds(recipient));
        },
        [auction, handleTransaction],
    );
    return { onTransferFunds: handleTransferFunds };
};

export default useNFTAuctionTransferFunds;
