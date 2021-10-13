import { useCallback, useState } from "react";
import useSVGNFTContract from "./useSVGNFT";

const useSVGNFTData = () => {
    const [secret, setSecret] = useState<string>();
    const [tokenURI, setTokenURI] = useState<string>("empty.jpg");

    const svgnft = useSVGNFTContract();

    const handleGetData = useCallback(
        async (tokenId: number) => {
            const tokenURI = await svgnft.tokenURI(tokenId);
            setSecret(await svgnft.secret(tokenId));
            setTokenURI(tokenURI);

            console.log(tokenURI);
        },
        [svgnft, setSecret, setTokenURI],
    );

    return { secret, tokenURI, onGetData: handleGetData };
};

export default useSVGNFTData;
