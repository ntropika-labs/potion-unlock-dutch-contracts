import { useCallback, useEffect, useState } from "react";
import useMockWETH from "./useMockWETH";
import { BigNumber } from "@ethersproject/bignumber";

const useMockWETHBalanceOf = (props: any, address: string) => {
    const [balance, setBalance] = useState<BigNumber>(BigNumber.from(0));
    const mockWETH = useMockWETH();

    const fetchBalanceOf = useCallback(async () => {
        setBalance(await mockWETH.balanceOf(address));
    }, [mockWETH, address, setBalance]);

    useEffect(() => {
        fetchBalanceOf().catch(err => console.error(`Failed to fetch NFT auction latest bid: ${err.stack}`));
        const refreshInterval = setInterval(fetchBalanceOf, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchBalanceOf]);

    return balance;
};

export default useMockWETHBalanceOf;
