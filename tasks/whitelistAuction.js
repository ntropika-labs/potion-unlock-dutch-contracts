const { readFileSync } = require("fs");
const request = require("request-promise-native");
const cliProgress = require("cli-progress");
const storage = require("node-persist");
const { color } = require("console-log-colors");
const { red, green, cyan, yellow, bold } = color;
const { ErrorAndExit, confirmAction } = require("../scripts/lib/ui_utils");

const { task, types } = require("hardhat/config");

require("dotenv").config();

// Gas limits for gas estimations and batch size estimations
const SAFE_BLOCK_GAS_LIMIT = 20000000; // Used to estimate batch size
const HARD_BLOCK_GAS_LIMIT = 25000000; // Used to determine if the given batch size is safe

// Starting batch size for batch size estimation
const STARTING_BATCH_SIZE = 100;

// Maximum number of iterations to run for estimating the batch size
const MAX_ITERATIONS_BATCH_SIZE_ESTIMATION = 20;

async function init() {
    // Initialize storage
    await storage.init();
}

async function getContract(args, ethers) {
    // Connect the contract as a NFTPotionAccessList contract
    const NFTPotionAccessList = await ethers.getContractFactory("NFTPotionAccessList");
    return NFTPotionAccessList.attach(args.contract);
}

async function resetStorage() {
    await storage.setItem("remainingAddresses", undefined);
    await storage.setItem("totalNumberAddresses", 0);
    await storage.setItem("numBatches", 0);
    await storage.setItem("totalCost", 0);
    await storage.setItem("state", undefined);
}

function getAllAddresses(args) {
    return readFileSync(args.file, "utf8").trim().split(/\r?\n/);
}

async function getCurrentState(args) {
    let addresses = [];
    let state = undefined;
    let totalCost = 0;
    let numBatches = 0;
    let totalNumberAddresses = 0;
    let pending = false;

    const remainingAddresses = await storage.getItem("remainingAddresses");

    // Read the addresses
    if (remainingAddresses === undefined) {
        addresses = getAllAddresses(args);
    } else {
        addresses = remainingAddresses;
        state = await storage.getItem("state");
        totalCost = await storage.getItem("totalCost");
        numBatches = await storage.getItem("numBatches");
        totalNumberAddresses = await storage.getItem("totalNumberAddresses");
        pending = true;
    }

    return { pending, addresses, state, totalCost, numBatches, totalNumberAddresses };
}

async function getPrices() {
    let ethPrice = null;
    let gasPrice = null;

    const token = "ETH";
    const priceCurrency = "USD";
    const gasPriceApi = "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice";
    const coinmarketcap =
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/` +
        `latest?symbol=${token}&CMC_PRO_API_KEY=${process.env.COINMARKETCAP_API_KEY}&convert=${priceCurrency}`;

    // Currency market data: coinmarketcap
    try {
        let response = await request.get(coinmarketcap);
        response = JSON.parse(response);
        ethPrice = response.data[token].quote[priceCurrency].price.toFixed(2);
    } catch (error) {
        throw new Error("Failed to get ETH price from coinmarketcap");
    }

    // Gas price data: etherscan (or `gasPriceAPI`)
    try {
        let response = await request.get(gasPriceApi);
        response = JSON.parse(response);
        gasPrice = Math.round(parseInt(response.result, 16) / Math.pow(10, 9));
    } catch (error) {
        throw new Error("Failed to get gas price from etherscan");
    }

    return { ethPrice, gasPrice };
}

async function estimateBatchSize(contract) {
    console.log(cyan(`\n[Estimating Batch Size]\n`));

    const estimateProgressBar = new cliProgress.SingleBar(
        {
            format: cyan(
                "BATCH SIZE [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Batch Size: {batchsize} | Gas Used: {gasused}",
            ),
        },
        cliProgress.Presets.shades_classic,
    );
    estimateProgressBar.start(MAX_ITERATIONS_BATCH_SIZE_ESTIMATION, 0, { batchsize: "N/A", gasused: "N/A" });

    let previousBatchSize = 0;
    let previousGasUsed = 0;
    let currentBatchSize = STARTING_BATCH_SIZE;
    let currentGasUsed = 0;

    for (let i = 0; i < MAX_ITERATIONS_BATCH_SIZE_ESTIMATION; i++) {
        const addresses = new Array(currentBatchSize).fill("0xc892cfd3e75Cf428BDD25576e9a42D515697B2C7");

        currentGasUsed = (await contract.estimateGas.setAccessAll(addresses, true)).toNumber();

        // Ideal batch size may have been found
        if (
            (currentGasUsed > SAFE_BLOCK_GAS_LIMIT && previousGasUsed <= SAFE_BLOCK_GAS_LIMIT) ||
            (currentGasUsed === previousGasUsed && currentBatchSize === previousBatchSize)
        ) {
            if (previousBatchSize === 0) {
                ErrorAndExit(
                    `Current starting batch size (${STARTING_BATCH_SIZE}) is already consuming all gas, please set it lower`,
                );
            }

            estimateProgressBar.stop();
            return previousBatchSize;
        }

        const gasPerAddress = currentGasUsed / currentBatchSize;

        previousBatchSize = currentBatchSize;
        previousGasUsed = currentGasUsed;

        // Approach up to a 95% of the gas limit to allow for wiggle room
        currentBatchSize = Math.floor((0.95 * SAFE_BLOCK_GAS_LIMIT) / gasPerAddress);

        estimateProgressBar.increment(1, {
            batchsize: previousBatchSize,
            gasused: previousGasUsed,
        });
    }

    estimateProgressBar.stop();

    ErrorAndExit(
        `Could not find a safe batch size after ${MAX_ITERATIONS_BATCH_SIZE_ESTIMATION} iterations. Please set it manually`,
    );
}

async function estimateGasCost(args, contract, gasPrice, ethPrice) {
    let numBatches = 0;
    let totalCost = 0;

    console.log(cyan(`\n[Estimating Gas Costs]\n`));

    // Estimate the gas costs for all transactions
    const addresses = await getAllAddresses(args);
    const totalNumberAddresses = addresses.length;

    const estimateProgressBar = new cliProgress.SingleBar(
        {
            format:
                cyan("GAS COST [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Total Cost: ") +
                green("${cost} "),
        },
        cliProgress.Presets.shades_classic,
    );
    estimateProgressBar.start(addresses.length, 0, { cost: "N/A", gas: "N/A" });

    const addressesToWhitelist = addresses.slice();
    while (addressesToWhitelist.length > 0) {
        const batch = addressesToWhitelist.splice(0, args.batchsize);

        const gasUsed = await contract.estimateGas.setAccessAll(batch, true);

        if (gasUsed > HARD_BLOCK_GAS_LIMIT) {
            ErrorAndExit(
                `\n\nBatch size is causing the transaction to exceed the block gas limit (Used ${gasUsed} gas of ${HARD_BLOCK_GAS_LIMIT})`,
            );
        }
        const gasCost = (gasUsed.toNumber() * gasPrice * ethPrice) / 1e9;

        totalCost += gasCost;
        numBatches++;

        estimateProgressBar.increment(batch.length, {
            cost: totalCost.toFixed(2),
            gas: gasUsed.toNumber(),
        });
    }

    estimateProgressBar.stop();

    return { totalNumberAddresses, numBatches, totalCost };
}

async function executeWhitelist(args, contract, gasPrice, ethPrice) {
    console.log(red(`\n--------------------------------------------------------`));
    console.log(red(`Task will be executed, this will incurr in actual costs!`));
    console.log(red(`--------------------------------------------------------`));

    if (!(await confirmAction("Do you want to continue? (y/N) "))) {
        ErrorAndExit("Aborting task execution...");
    }

    let { addresses, state, totalCost, numBatches, totalNumberAddresses } = await getCurrentState(args);

    if (state === "validating") {
        console.log(red("Previous execution was correct, skipping whitelisting and jumping into validation"));
        return { totalCost, numBatches, totalNumberAddresses };
    }

    if (state !== "executing") {
        totalNumberAddresses = addresses.length;
    }

    console.log(yellow(`\n[Whitelisting Addresses]\n`));

    await storage.setItem("state", "executing");
    await storage.setItem("totalNumberAddresses", totalNumberAddresses);

    const progressBar = new cliProgress.SingleBar(
        {
            format:
                yellow("EXECUTING [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Total Cost: ") +
                green("${cost} "),
        },
        cliProgress.Presets.shades_classic,
    );

    const addressesToWhitelist = addresses.slice();

    progressBar.start(addresses.length, 0, { cost: totalCost.toFixed(2), gas: "N/A" });

    while (addressesToWhitelist.length > 0) {
        const batch = addressesToWhitelist.splice(0, args.batchsize);

        const tx = await contract.setAccessAll(batch, true);
        const receipt = await tx.wait();

        const gasUsed = receipt.gasUsed.toNumber();
        const gasCost = (gasUsed * gasPrice * ethPrice) / 1e9;

        totalCost += gasCost;
        numBatches++;

        progressBar.increment(batch.length, { cost: totalCost.toFixed(2), gas: gasUsed });

        await storage.setItem("remainingAddresses", addressesToWhitelist);
        await storage.setItem("numBatches", numBatches);
        await storage.setItem("totalCost", totalCost);
    }

    progressBar.stop();

    return { totalCost, numBatches, totalNumberAddresses };
}

async function validateWhitelist(args, contract) {
    let success = true;

    console.log(green(`\n[Validating Addresses]\n`));

    await storage.setItem("state", "validating");

    const progressBar = new cliProgress.SingleBar(
        {
            format: green("VALIDATING [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}"),
        },
        cliProgress.Presets.shades_classic,
    );

    const addresses = getAllAddresses(args);

    progressBar.start(addresses.length, 0, { cost: "N/A", gas: "N/A" });

    for (const address of addresses) {
        const canAccess = await contract.canAccess(address);

        if (!canAccess) {
            console.log(red(`Address ${address} does not have access!!`));

            success = false;
        }

        progressBar.increment();
    }

    progressBar.stop();

    return success;
}

function printStats(totalCost, numBatches, totalNumberAddresses) {
    console.log(cyan(`\n[STATS]\n`));
    console.log(bold(`Total number of whitelisted addresses: `) + `${totalNumberAddresses}`);
    console.log(bold(`Total number of batches: `) + `${numBatches}`);
    console.log(bold(`Total cost of whitelisting: `) + green(`$${totalCost.toFixed(2)}`) + `\n`);

    console.log(bold(`Average cost per batch: `) + green(`$${(totalCost / numBatches).toFixed(2)}`));
    console.log(bold(`Average cost per address: `) + green(`$${(totalCost / totalNumberAddresses).toFixed(2)}`));
}

function addTask() {
    task("whitelist", "Whitelist a list of addresses in the auction contract")
        .addParam("file", "File containing a list of all the address to be whitelisted", undefined, types.string, false)
        .addParam("contract", "Address of the contract to connect to", undefined, types.string, false)
        .addParam("mode", "Mode of execution. Can be 'estimate', 'execute' or 'validate'", "estimate", types.string)
        .addParam(
            "batchsize",
            "Number of addresses to be whitelisted with each TX. Default is 'auto' for auto-estimation",
            "auto",
            types.string,
        )
        .addFlag("skipgas", "Skips the gas estimation")
        .addFlag("skipvalidation", "Skips the whitelisting validation")
        .addFlag("reset", "Remove any pending addresses and start over")
        .setAction(async (args, hre) => {
            const network = hre.network;
            const ethers = hre.ethers;

            await init();

            if (args.reset) {
                await resetStorage();
            }

            let { pending, addresses, totalCost, numBatches, totalNumberAddresses } = await getCurrentState(args);
            if (pending) {
                console.log(
                    red(
                        `\nDetected unfinished task. Resuming for remaining ${addresses.length} of total ${totalNumberAddresses} addresses. Use --reset to start over`,
                    ),
                );
            }

            const AccessList = await getContract(args, ethers);

            if (args.mode === "execute") {
                console.log(red(`\n[FULL EXECUTION]\n`));
            } else if (args.mode === "estimate") {
                console.log(yellow(`\n[ESTIMATE ONLY]]\n`));
            } else if (args.mode === "validate") {
                console.log(yellow(`\n[VALIDATE ONLY]\n`));
            } else {
                ErrorAndExit(
                    `Invalid 'mode' parameter passed: ${args.mode}. Only 'estimate', 'execute' and 'validate' are supported`,
                );
            }

            console.log(`Getting prices from Etherscan and CoinMarketCap...\n`);
            const { ethPrice, gasPrice } = await getPrices();

            console.log(bold(`-------- CONFIG --------`));
            console.log(bold(`Network:    ${network.name}`));
            console.log(bold(`Contract:   ${args.contract}`));
            console.log(bold(`Batch size: ${args.batchsize}`));
            console.log(bold(`ETH price:  $${ethPrice}`));
            console.log(bold(`Gas price:  ${gasPrice} gwei`));
            console.log(bold(`------------------------`));

            if ((args.mode === "estimate" || args.mode === "execute") && args.batchsize === "auto") {
                args.batchsize = await estimateBatchSize(AccessList);

                console.log(bold(`Auto-estimated batch size: ${args.batchsize}`));
            }

            let success = false;

            // Gas estimation
            if (args.mode === "estimate" || (args.mode === "execute" && !args.skipgas)) {
                ({ totalCost, numBatches, totalNumberAddresses } = await estimateGasCost(
                    args,
                    AccessList,
                    gasPrice,
                    ethPrice,
                ));
            }

            // Whitelisting
            if (args.mode === "execute") {
                ({ totalCost, numBatches, totalNumberAddresses } = await executeWhitelist(
                    args,
                    AccessList,
                    gasPrice,
                    ethPrice,
                ));
            }

            if ((args.mode === "validate" || args.mode === "execute") && !args.skipvalidation) {
                success = await validateWhitelist(args, AccessList);
            }

            // Stats
            printStats(totalCost, numBatches, totalNumberAddresses);

            // Final message
            if (args.mode === "execute") {
                if (success) {
                    console.log(green(`\n[SUCCESS]`));

                    await resetStorage();
                } else {
                    console.log(red(`\n[FAILED]`));
                }
            } else if (args.mode === "estimate") {
                console.log(red("\nNow run again with '--mode execute' to actually whitelist the addresses!!"));
            }
        });
}

module.exports = addTask;
