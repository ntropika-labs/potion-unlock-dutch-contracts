const readline = require("readline");
const { readFileSync } = require("fs");
const util = require("util");

const request = require("request-promise-native");
const cliProgress = require("cli-progress");
const storage = require("node-persist");
const { color } = require("console-log-colors");
const { red, green, cyan, yellow, bold } = color;

const { task, types } = require("hardhat/config");

require("dotenv").config();

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

async function confirmAction(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    // Prepare readline.question for promisification
    rl.question[util.promisify.custom] = question => {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    };

    const question = util.promisify(rl.question);
    const answer = await question(bold(message));

    if (answer === "y" || answer === "yes" || answer === "Y" || answer === "YES") {
        return true;
    } else {
        return false;
    }
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

        console.log(
            red(
                `\nDetected unfinished task. Resuming for remaining ${remainingAddresses.length} addresses. Use --reset to start over`,
            ),
        );
    }

    return { addresses, state, totalCost, numBatches, totalNumberAddresses };
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

async function estimateGasCost(args, contract, gasPrice, ethPrice) {
    let numBatches = 0;
    let totalCost = 0;

    console.log(cyan(`\n[Estimating Gas Costs]\n`));

    // Estimate the gas cost for 1 batch
    const addresses = await getAllAddresses(args);
    const singleBatch = addresses.slice(0, args.batchsize);
    const singleBatchGasEstimation = await contract.estimateGas.setAccessAll(singleBatch, true);
    const singleBatchCost = (singleBatchGasEstimation.toNumber() * gasPrice * ethPrice) / 1e9;

    console.log(`Gas used for 1 batch: ${singleBatchGasEstimation} gwei ($${singleBatchCost.toFixed(2)})`);

    // Estimate the gas costs for all transactions
    const totalNumberAddresses = addresses.length;

    const estimateProgressBar = new cliProgress.SingleBar(
        {
            format:
                cyan("ESTIMATING [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Total Cost: ") +
                green("${cost} "),
            hideCursor: true,
        },
        cliProgress.Presets.shades_classic,
    );
    estimateProgressBar.start(addresses.length, 0, { cost: "N/A", gas: "N/A" });

    const addressesToWhitelist = addresses.slice();
    while (addressesToWhitelist.length > 0) {
        const batch = addressesToWhitelist.splice(0, args.batchsize);

        const gasEstimation = await contract.estimateGas.setAccessAll(batch, true);
        const gasCost = (gasEstimation.toNumber() * gasPrice * ethPrice) / 1e9;

        totalCost += gasCost;
        numBatches++;

        estimateProgressBar.increment(batch.length, {
            cost: totalCost.toFixed(2),
            gas: gasEstimation.toNumber(),
        });
    }

    estimateProgressBar.stop();

    return { totalNumberAddresses, numBatches, totalCost };
}

async function executeWhitelist(args, contract, gasPrice, ethPrice) {
    let { addresses, state, totalCost, numBatches, totalNumberAddresses } = await getCurrentState(args);

    if (state === "validating") {
        console.log(red("Previous execution was correct, skipping whitelisting and jumping into validation"));
        return { totalCost, numBatches, totalNumberAddresses };
    }

    if (state !== "executing") {
        await storage.setItem("totalNumberAddresses", addresses.length);
    }

    console.log(yellow(`\n[Whitelisting Addresses]\n`));

    await storage.setItem("state", "executing");

    const progressBar = new cliProgress.SingleBar(
        {
            format:
                yellow("EXECUTING [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Total Cost: ") +
                green("${cost} "),
            hideCursor: true,
        },
        cliProgress.Presets.shades_classic,
    );

    const addressesToWhitelist = addresses.slice();

    progressBar.start(addresses.length, 0, { cost: "N/A", gas: "N/A" });

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
    console.log(red(`\n[STATS]\n`));
    console.log(bold(`Total number of whitelisted addresses: `) + bold(`${totalNumberAddresses}`));
    console.log(bold(`Total number of batches: `) + bold(`${numBatches}`));
    console.log(bold(`Total cost of whitelisting: `) + green(`$${totalCost.toFixed(2)}`) + `\n`);

    console.log(bold(`Average cost per batch: `) + green(`$${(totalCost / numBatches).toFixed(2)}`));
    console.log(bold(`Average cost per address: `) + green(`$${(totalCost / totalNumberAddresses).toFixed(2)}`));
}

function addTask() {
    task("whitelist", "Whitelist a list of addresses in the auction contract")
        .addParam("file", "File containing a list of all the address to be whitelisted", undefined, types.string, false)
        .addParam("contract", "Address of the contract to connect to", undefined, types.string, false)
        .addParam("batchsize", "Number of addresses to be whitelisted with each TX", 100, types.int)
        .addFlag("execute", "Disables the Dry Run and actually runs the task")
        .addFlag("reset", "Remove any pending addresses and start over")
        .setAction(async (args, hre) => {
            const network = hre.network;
            const ethers = hre.ethers;

            await init();

            if (args.reset) {
                await resetStorage();
            }

            const AccessList = await getContract(args, ethers);

            if (args.execute) {
                console.log(red(`\n[EXECUTING TASK]\n`));
            } else {
                console.log(yellow(`\n[DRY RUN]\n`));
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

            // Gas estimation
            let { totalCost, numBatches, totalNumberAddresses } = await estimateGasCost(
                args,
                AccessList,
                gasPrice,
                ethPrice,
            );

            // Execute the whitelisting if requested
            if (args.execute) {
                console.log(red(`\n--------------------------------------------------------`));
                console.log(red(`Task will be executed, this will incurr in actual costs!`));
                console.log(red(`--------------------------------------------------------`));

                if (!(await confirmAction("Do you want to continue? (y/N) "))) {
                    console.log(red("Aborting task execution..."));
                    return;
                }

                ({ totalCost, numBatches, totalNumberAddresses } = await executeWhitelist(
                    args,
                    AccessList,
                    gasPrice,
                    ethPrice,
                ));

                const success = await validateWhitelist(args, AccessList);
                if (success) {
                    printStats(totalCost, numBatches, totalNumberAddresses);

                    console.log(green(`\n[SUCCESS]`));

                    await resetStorage();
                }
            } else {
                printStats(totalCost, numBatches, totalNumberAddresses);

                console.log(red("\nNow run again with the --execute flag to actually whitelist the addresses!!"));
            }
        });
}

module.exports = addTask;
