import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionRefundAmount = (props: any) => {
    const [refundAmount, setRefundAmount] = useState<BigNumber>(BigNumber.from(0));
    const auction = useNFTAuction();

    const fetchRefundAmount = useCallback(async () => {
        const refund = await auction.refundAmount();
        setRefundAmount(refund);
    }, [auction, setRefundAmount]);

    useEffect(() => {
        fetchRefundAmount().catch(err => console.error(`Failed to fetch NFT auction refund amount: ${err.stack}`));
        const refreshInterval = setInterval(fetchRefundAmount, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchRefundAmount]);

    return refundAmount;
};

export default useNFTAuctionRefundAmount;
