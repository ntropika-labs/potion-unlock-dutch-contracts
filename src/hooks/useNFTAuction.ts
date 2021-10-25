import { useContext } from "react";
import { Context } from "../contexts/NFTAuctionContractProvider";

const useNFTAuction = () => {
    const { NFTAuctionContract } = useContext(Context);
    return NFTAuctionContract;
};

export default useNFTAuction;
