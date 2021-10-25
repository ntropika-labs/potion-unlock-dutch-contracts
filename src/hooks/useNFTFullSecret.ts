import { useCallback, useState } from "react";
import useNFTContract from "./useNFTContract";

const useNFTFullSecret = () => {
    const [fullSecret, setFullSecret] = useState<string>();

    const nft = useNFTContract();

    const handleGetFullSecret = useCallback(async () => {
        setFullSecret(await nft.fullSecret());
    }, [nft, setFullSecret]);

    return { fullSecret, onGetFullSecret: handleGetFullSecret };
};

export default useNFTFullSecret;
