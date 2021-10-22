import { useCallback, useState } from "react";
import useNFTContract from "./useNFTContract";

const useNFTData = () => {
    const [secret, setSecret] = useState<string>();
    const [tokenURI, setTokenURI] = useState<string>("empty.jpg");

    const nft = useNFTContract();

    const handleGetData = useCallback(
        async (tokenId: number) => {
            const tokenURI = await nft.tokenURI(tokenId);
            setSecret(await nft.secret(tokenId));
            setTokenURI(tokenURI);

            console.log(tokenURI);
        },
        [nft, setSecret, setTokenURI],
    );

    return { secret, tokenURI, onGetData: handleGetData };
};

export default useNFTData;
