import { useCallback, useEffect, useState } from "react";
import useNFTAuction from "./useNFTAuction";
import { BigNumber } from "@ethersproject/bignumber";

const useNFTAuctionEtherBalance = (props: any) => {
    const [balance, setBalance] = useState<BigNumber>(BigNumber.from(0));
    const auction = useNFTAuction();

    const fetchClaimableFunds = useCallback(async () => {
        setBalance(await auction.balance());
    }, [auction, setBalance]);

    useEffect(() => {
        fetchClaimableFunds().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchClaimableFunds, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchClaimableFunds]);

    return balance;
};

export default useNFTAuctionEtherBalance;
