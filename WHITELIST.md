# Whitelisting task

The whitelisting task allows the user to whitelist addresses in the NFTPotion contract in an easy way. It supports fetching the gas price from Etherscan and the ETH price from CoinMarketCap. It also estimates the
best batch size for optimizing the transactions, and calculates the estimated total cost of whitelisting a list of addresses.

## TLDR;

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode execute`

## How-to-use

The first thing to do is to read the **README.md** file to setup the **.env** file correctly. In particular to setup the **COINMARKETCAP_API_KEY** that the script will use to fetch the ETH/USD price, and the **DEPLOYER_MNEMONIC** that will be used to sign transactions.

The script has several options that work together to offer several functionalities. The main 3 modes of operation are:

-   **Estimate**: Estimates the ideal batch size and the costs of running the script to whitelist the given addresses using that batch size. The cost is given in dollars ($) and uses the information of the current gas price provided by **Etherscan** and the price of ETH/USD provided by **CoinMarketCap**. Be aware that due to the gas price and ETH/USD changing its value constantly the estimation may be off after some minutes or even seconds
-   **Validate**: It validates the list of addresses against the provided contract address to make sure
    that the address have been correctly whitelisted. This mode can only be used after having executed the transactions to whitelist the addresses
-   **Execute**: This mode includes the 2 previous ones (**Estimate** and **Validate**) and also executes the whitelist transactions, actually incurring in gas costs for the configured deployer account. The sequence of actions is **Estimate**, **Execute** and **Validate**

The script also tries to be smart and it will try to recover from a failed **Execute** as much as it can. The script saves the last batch that was attempted and it will restart from that batch to try to complete the task. To achieve this, if a task has failed the user just needs to run the script with the same parameters again and the script will indicate that it is resuming the operation.

Some parameters allow to modify the behaviour of the above mentioned modes. These parameters are explained in the following section.

## Mandatory Parameters

-   **--network**: Network to run the script on. This must be one of the networks defined in the **hardhat_config.js** file
-   **--file**: Option to pass the file that contains the list of addresses. This file must have each address on a different line
-   **--contract**: Address of the deployed NFTPotion contract in the **0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15** format
-   **--mode**: It can be **'estimate'**, **'execute'** or **'validate'** for each of the behaviours explained in the previous section.

## Optional Parameters

-   **--batchsize**: It allows the user to indicate the batch size to use for the whitelisting transactions. This cancels the batch size auto-estimation.
-   **--skipgas**: Cancels the gas cost estimation done before the actual execution. Use with care as the gas estimation given in a previous run may not apply anymore due to the nature of the gas price and the ETH/USD price, than can change unpredictably in a matter of seconds
-   **--skipvalidation**: Cancels the final validation after executing all transactions. The validation can be run later on in isolation by using the **--mode validate** option
-   **--reset**: Allows the user to cancel a previous incomplete run and start the process from the beginning. Be aware that the script will execute all transactions again and that the user may end up paying more gas than originally expected

## Examples

### Simple run

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode execute`

### Estimate only

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode estimate`

### Estimate for a given batch size

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode estimate --batchsize 1000`

### Execute without any estimations

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode execute --skipgas --batchsize 1000`

### Validate only

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode validate`

### Reset a failed execution

`$ npx hardhat --network mainnet whitelist --file addresses_list.txt --contract 0x15bd65ebB19Ed55B306B8F47b3004d8c247b5c15 --mode execute --reset`
