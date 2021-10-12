import { useContext } from "react";
import { Context } from "../contexts/NFTValidatorContractProvider";

const useNFTValidatorContract = () => {
    const { NFTValidatorContract } = useContext(Context);
    return NFTValidatorContract;
};

export default useNFTValidatorContract;
