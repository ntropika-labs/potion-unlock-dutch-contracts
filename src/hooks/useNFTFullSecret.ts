import { useCallback, useEffect, useState } from "react";
import useNFTContract from "./useNFTContract";

const useNFTFullSecret = () => {
    const [fullSecret, setFullSecret] = useState<string>();

    const nft = useNFTContract();

    const fetchFullSecret = useCallback(async () => {
        setFullSecret(await nft.fullSecret());
    }, [nft, setFullSecret]);

    useEffect(() => {
        fetchFullSecret().catch(err => console.error(`Failed to fetch NFT full secret: ${err.stack}`));
        const refreshInterval = setInterval(fetchFullSecret, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchFullSecret]);

    return fullSecret;
};

export default useNFTFullSecret;
