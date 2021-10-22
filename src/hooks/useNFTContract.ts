import { useContext } from "react";
import { Context } from "../contexts/NFTPotionContractProvider";

const useNFTContract = () => {
    const { NFTAuctionContract: NFTPotionContract } = useContext(Context);
    return NFTPotionContract;
};

export default useNFTContract;
