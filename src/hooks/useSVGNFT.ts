import { useContext } from "react";
import { Context } from "../contexts/SVGNFTContractProvider";

const useSVGNFTContract = () => {
    const { SVGNFTContract } = useContext(Context);
    return SVGNFTContract;
};

export default useSVGNFTContract;
