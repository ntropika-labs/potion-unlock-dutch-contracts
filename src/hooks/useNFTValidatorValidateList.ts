import { useCallback } from "react";
import useNFTValidatorContract from "./useNFTValidator";
import useHandleTransaction from "./useHandleTransaction";

const useNFTValidatorValidateList = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const nftValidator = useNFTValidatorContract();

    const handleValidateList = useCallback(
        async (tokenIds: string, decryptedSecrets: string, proofs: string) => {
            handleTransaction(
                nftValidator.validateList(JSON.parse(tokenIds), JSON.parse(decryptedSecrets), JSON.parse(proofs)),
            );
        },
        [nftValidator, handleTransaction],
    );
    return { onValidateList: handleValidateList };
};

export default useNFTValidatorValidateList;
