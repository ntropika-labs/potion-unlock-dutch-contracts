import { useCallback } from "react";
import useMockWETH from "./useMockWETH";
import useHandleTransaction from "./useHandleTransaction";
import { BigNumber } from "@ethersproject/bignumber";

const useMockWETHIncreaseAllowance = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const mockWETH = useMockWETH();

    const handleIncreaseAllowance = useCallback(
        async (spender: string, addedValue: BigNumber) => {
            handleTransaction(mockWETH.increaseAllowance(spender, addedValue));
        },
        [mockWETH, handleTransaction],
    );
    return { onIncreaseAllowance: handleIncreaseAllowance };
};

export default useMockWETHIncreaseAllowance;
