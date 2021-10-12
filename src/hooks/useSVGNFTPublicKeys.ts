import { useCallback, useEffect, useState } from "react";
import useSVGNFTContract from "./useSVGNFT";

const useSVGNFTPublicKeys = () => {
    const svgnft = useSVGNFTContract();
    const [publicKeys, setPublicKeys] = useState<string>();

    const fetchPublicKeys = useCallback(async () => {
        const nextTokenId = await svgnft.nextTokenId();

        let publicKeys = [];
        for (let i = 1; i < nextTokenId; ++i) {
            publicKeys.push(await svgnft.encryptionKeys(i));
        }
        setPublicKeys(JSON.stringify(publicKeys, null, " "));
    }, [svgnft, setPublicKeys]);

    useEffect(() => {
        fetchPublicKeys().catch(err => console.error(`Failed to fetch NFT validation message: ${err.stack}`));
        const refreshInterval = setInterval(fetchPublicKeys, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchPublicKeys]);

    return publicKeys;
};

export default useSVGNFTPublicKeys;
