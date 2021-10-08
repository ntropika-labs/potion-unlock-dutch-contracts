import { BigNumber } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import useSimpleContract from './useSimpleContract';

const useSimpleValue = () => {
    const [value, setValue] = useState<BigNumber>();
    const simple = useSimpleContract();
    const unlocked = simple?.isUnlocked;

    const fetchValue = useCallback(async () => {
        setValue(await simple.value());
    }, [setValue, simple]);

    useEffect(() => {
        if (unlocked) {
            fetchValue().catch((err) => console.error(`Failed to fetch simple value: ${err.stack}`));
            const refreshInterval = setInterval(fetchValue, 1000);
            return () => clearInterval(refreshInterval);
        }
    }, [fetchValue, simple, unlocked]);

    return value;
};

export default useSimpleValue;
