import { useCallback, useState } from "react";
import useSVGNFTContract from "./useSVGNFT";

const useSVGNFTFullSecret = () => {
    const [fullSecret, setFullSecret] = useState<string>();

    const svgnft = useSVGNFTContract();

    const handleGetFullSecret = useCallback(async () => {
        setFullSecret(await svgnft.fullSecret());
    }, [svgnft, setFullSecret]);

    return { fullSecret, onGetFullSecret: handleGetFullSecret };
};

export default useSVGNFTFullSecret;
