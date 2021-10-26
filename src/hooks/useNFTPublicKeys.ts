import { useCallback, useEffect, useState } from "react";
import useNFTContract from "./useNFTContract";

const useNFTPublicKeys = () => {
    const nft = useNFTContract();
    const [publicKeys, setPublicKeys] = useState<string>();

    const fetchPublicKeys = useCallback(async () => {
        const numMintedTokens = await nft.numMintedTokens();

        let publicKeys = [];
        for (let i = 1; i <= numMintedTokens; ++i) {
            publicKeys.push(await nft.encryptionKeys(i));
        }
        setPublicKeys(JSON.stringify(publicKeys, null, " "));
    }, [nft, setPublicKeys]);

    useEffect(() => {
        fetchPublicKeys().catch(err => console.error(`Failed to fetch NFT validation message: ${err.stack}`));
        const refreshInterval = setInterval(fetchPublicKeys, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchPublicKeys]);

    return publicKeys;
};

export default useNFTPublicKeys;
