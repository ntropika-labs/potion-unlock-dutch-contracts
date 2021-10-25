import { useContext } from "react";
import { Context } from "../contexts/MockWETHContractProvider";

const useMockWETH = () => {
    const { MockWETHContract } = useContext(Context);
    return MockWETHContract;
};

export default useMockWETH;
