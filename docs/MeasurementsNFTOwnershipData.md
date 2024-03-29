

------------
  Summary
------------

·---------------------|-----------------------|-----------------------|-----------------------------------------|---------------------------------------·
|   gas = 192 gwei    ·  Base Line (avg/max)  ·  uint128[] (avg/max)  ·  struct { uint128, uint128 } (avg/max)  · struct { uint256, uint256 } (avg/max) |
······················|·······················|·······················|·········································|········································
| Single              ·     84686 / 117982    ·    104452 / 162518    ·              112948 / 162489            ·            135006 / 184547            |
······················|·······················|·······················|·········································|········································
|   Increase %        ·        0% / 0%        ·     23.3% / 38.7%     ·               33.3% / 37.7%             ·             59.4% / 56.4              |
······················|·······················|·······················|·········································|········································
|   Price Avg. Unit   ·         49.4€         ·         61.04€        ·                  65.96€                 ·                 78.88€                |
······················|·······················|·······················|·········································|········································
| Multiple (100)      ·     25525 / 26215     ·     37124 / 38145     ·               25811 / 26660             ·             26031 / 26881             |
······················|·······················|·······················|·········································|········································
|   Increase %        ·        0% / 0%        ·     45.4% / 45.5%     ·                1.1% / 1.6%              ·              1.9% / 2.5%              |
······················|·······················|·······················|·········································|········································
|   Price Avg. (Unit) ·   1494.76€ (14.94€)   ·    2225.6€ (22.25€)   ·            1546.44€ (15.46€)            ·             1562€ (15.62€)            |
·---------------------|-----------------------|-----------------------|-----------------------------------------|---------------------------------------·



----------------------------------------------------------------------------------------------------------------------------------------------------

--------------------------
Single purchase base line
--------------------------

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               43 gwei/gas               ·       3390.39 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      34234  ·           40  ·       4.99  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·      83782  ·     117982  ·      84686  ·          800  ·      12.35  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           20  ·       6.76  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      11.77  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       3.91  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       4.88  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7009639  ·       23.4 %  ·    1021.91  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

----------------------------------------------
Single purchase with array of uint128 for IDs
----------------------------------------------

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               43 gwei/gas               ·       3397.05 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      34234  ·           40  ·       5.00  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·      94168  ·     162518  ·     104452  ·          800  ·      15.26  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           20  ·       6.78  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      11.80  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       3.92  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       4.89  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7028656  ·       23.4 %  ·    1026.70  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

-----------------------------------------------------------
Single purchase with array of range (uint128, uint128) IDs
-----------------------------------------------------------

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               43 gwei/gas               ·       3394.49 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      34234  ·           40  ·       5.00  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·     111189  ·     162489  ·     112948  ·          800  ·      16.49  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           20  ·       6.77  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      11.79  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       3.92  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       4.89  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7028704  ·       23.4 %  ·    1025.93  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

-----------------------------------------------------------
Single purchase with array of range (uint256, uint256) IDs
-----------------------------------------------------------

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               43 gwei/gas               ·       3396.89 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      34234  ·           40  ·       5.00  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·     133247  ·     184547  ·     135006  ·          800  ·      19.72  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           20  ·       6.78  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      11.80  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       3.92  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       4.89  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7021093  ·       23.4 %  ·    1025.54  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

----------------------------------
Multiple purchase (100) base line
----------------------------------

Avg. gas per NFT = 25525.07

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               43 gwei/gas               ·       3404.72 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      32974  ·            4  ·       4.83  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·    2030974  ·    2621517  ·    2552507  ·           30  ·     373.69  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           10  ·       6.79  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80852  ·            2  ·      11.84  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26816  ·            2  ·       3.93  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       4.90  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    6978772  ·       23.3 %  ·    1021.71  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

------------------------------------------------------
Multiple purchase (100) with array of uint128 for IDs
------------------------------------------------------

Avg. gas per NFT = 37123.71

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               44 gwei/gas               ·       3406.29 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      32974  ·            4  ·       4.94  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·    2949232  ·    3814517  ·    3712371  ·           30  ·     556.40  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           10  ·       6.95  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      12.10  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       4.02  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       5.02  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7028716  ·       23.4 %  ·    1053.44  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

-------------------------------------------------------------
Multiple purchase with array of range (uint128, uint128) IDs
-------------------------------------------------------------

Avg. gas cost per NFT = 25810.55

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               44 gwei/gas               ·       3404.28 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      32974  ·            4  ·       4.94  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·    2058381  ·    2666025  ·    2581055  ·           30  ·     386.61  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           10  ·       6.95  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      12.10  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       4.02  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       5.02  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7028644  ·       23.4 %  ·    1052.81  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·

-------------------------------------------------------------
Multiple purchase with array of range (uint256, uint256) IDs
-------------------------------------------------------------

Avg. gas cost per NFT = 26031.13

·-------------------------------|---------------------------|-------------|-----------------------------·
|      Solc version: 0.8.9      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
································|···························|·············|······························
|  Methods                      ·               44 gwei/gas               ·       3409.41 eur/eth       │
··············|·················|·············|·············|·············|···············|··············
|  Contract   ·  Method         ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  changePrice    ·      31574  ·      34374  ·      32974  ·            4  ·       4.95  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  purchase       ·    2080439  ·    2688083  ·    2603113  ·           30  ·     390.50  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  setAccess      ·      46385  ·      46397  ·      46396  ·           10  ·       6.96  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  startAuction   ·          -  ·          -  ·      80764  ·            2  ·      12.12  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  stopAuction    ·          -  ·          -  ·      26838  ·            2  ·       4.03  │
··············|·················|·············|·············|·············|···············|··············
|  NFTPotion  ·  transferFunds  ·          -  ·          -  ·      33481  ·            2  ·       5.02  │
··············|·················|·············|·············|·············|···············|··············
|  Deployments                  ·                                         ·  % of limit   ·             │
································|·············|·············|·············|···············|··············
|  NFTPotion                    ·          -  ·          -  ·    7021069  ·       23.4 %  ·    1053.26  │
·-------------------------------|-------------|-------------|-------------|---------------|-------------·