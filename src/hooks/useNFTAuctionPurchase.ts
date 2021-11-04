import { useCallback } from "react";
import useNFTAuction from "./useNFTAuction";
import useHandleTransaction from "./useHandleTransaction";

const useNFTAuctionPurchase = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const auction = useNFTAuction();

    const handlePurchase = useCallback(
        async (numTokens: string, priceToPay: string) => {
            handleTransaction(auction.purchase(numTokens, priceToPay));
        },
        [auction, handleTransaction],
    );
    return { onPurchase: handlePurchase };
};

export default useNFTAuctionPurchase;
