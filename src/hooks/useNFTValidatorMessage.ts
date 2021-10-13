import { useCallback, useEffect, useState } from "react";
import useNFTValidatorContract from "./useNFTValidator";

const useNFTValidatorMessage = () => {
    const [message, setMessage] = useState<string>();

    const nftValidator = useNFTValidatorContract();

    const fetchMessage = useCallback(async () => {
        try {
            setMessage(await nftValidator.getMessage());
        } catch {}
    }, [nftValidator, setMessage]);

    useEffect(() => {
        fetchMessage().catch(err => console.error(`Failed to fetch NFT validation message: ${err.stack}`));
        const refreshInterval = setInterval(fetchMessage, 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchMessage]);

    return message;
};

export default useNFTValidatorMessage;
