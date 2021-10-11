import { useCallback, useState } from "react";
import useSVGNFTContract from "./useSVGNFT";

const useSVGNFTData = () => {
    const [secret, setSecret] = useState<string>();
    const [tokenURI, setTokenURI] = useState<string>();

    const svgnft = useSVGNFTContract();

    const handleGetData = useCallback(
        async (tokenId: number) => {
            setSecret(await svgnft.secret(tokenId));
            setTokenURI(await svgnft.tokenURI(tokenId));
        },
        [svgnft, setSecret, setTokenURI]
    );

    return { secret, tokenURI, onGetData: handleGetData };
};

export default useSVGNFTData;
