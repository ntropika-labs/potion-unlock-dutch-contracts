import { useCallback } from "react";
import useNFTValidatorContract from "./useNFTValidator";
import useHandleTransaction from "./useHandleTransaction";

const useNFTValidatorValidateList = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const nftValidator = useNFTValidatorContract();

    const handleValidateList = useCallback(
        async (tokenIds: number[], decryptedSecrets: string[], proof: string) => {
            handleTransaction(nftValidator.validateList(tokenIds, decryptedSecrets, proof));
        },
        [nftValidator, handleTransaction],
    );
    return { onValidateList: handleValidateList };
};

export default useNFTValidatorValidateList;
