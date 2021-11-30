const { task, types } = require("hardhat/config");
require("@nomiclabs/hardhat-waffle");
require("hardhat-abi-exporter");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-contract-sizer");

require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task("fastForward", "Fast forward time (only works for local test networks)")
    .addOptionalParam(
        "seconds",
        "Number of seconds by which the blockchain should advance time (default: one year)",
        31556952,
        types.int,
    )
    .setAction(async (args, hre) => {
        // Default to one year
        await hre.ethers.provider.send("evm_increaseTime", [args.seconds]);
        await hre.ethers.provider.send("evm_mine", []);
        console.log(`Fast forwarded time by ${args.seconds} seconds (${args.seconds / (60 * 60 * 24)} days)`);
    });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        version: "0.8.9",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    paths: {
        artifacts: "./src/artifacts",
    },
    networks: {
        rinkeby: {
            accounts: {
                count: 10,
                mnemonic: process.env.DEPLOYER_MNEMONIC,
                path: "m/44'/60'/0'/0",
            },
            chainId: 4,
            gas: "auto",
            gasPrice: "auto",
            url: process.env.ALCHEMY_API_KEY_RINKEBY,
        },
        hardhat: {
            chainId: 1337,
            gasPrice: 180000000000,
            accounts: {
                mnemonic: "test test test test test test test test test test test junk",
                path: "m/44'/60'/0'/0/",
                initialIndex: 0,
                count: 1000,
            },
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            gasPrice: 180000000000,
        },
    },
    abiExporter: {
        path: "./abis",
        clear: true,
        flat: true,
        only: [":NFT", ":INFTPotionValidator$"],
        spacing: 2,
        pretty: false,
    },
    gasReporter: {
        currency: "EUR",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
        enabled: true,
    },
};
