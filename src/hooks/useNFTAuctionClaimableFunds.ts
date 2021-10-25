import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionGetClaimableFunds = (props: any) => {
    const [funds, setFunds] = useState<BigNumber>(BigNumber.from(0));
    const auction = useNFTAuction();

    const fetchClaimableFunds = useCallback(async () => {
        const funds = await auction.claimableFunds();
        setFunds(funds);
    }, [auction, setFunds]);

    useEffect(() => {
        fetchClaimableFunds().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchClaimableFunds, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchClaimableFunds]);

    return funds;
};

export default useNFTAuctionGetClaimableFunds;
