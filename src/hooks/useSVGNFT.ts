import { useContext } from "react";
import { Context } from "../contexts/SVGNFTContractProvider";

const useSVGNFTContract = () => {
    const { NFTValidatorContract: SVGNFTContract } = useContext(Context);
    return SVGNFTContract;
};

export default useSVGNFTContract;
