const { readFileSync } = require("fs");
const { parse } = require("csv-parse/sync");
const yargs = require("yargs");

function getWhitelistStatus(whitelistStatusFile) {
    const whitelistCSV = readFileSync(whitelistStatusFile);
    let whitelistActions = parse(whitelistCSV, { columns: true, skip_empty_lines: true });

    whitelistActions = whitelistActions.map(action => ({
        Buyer: action.Buyer.replace("\\", "0"),
        Allow: action.Allow,
    }));

    let whitelist = {};
    for (const action of whitelistActions) {
        if (action.Allow !== "true" && action.Allow !== "false") {
            throw new Error(`Invalid value: Buyer=${action.Buyer} Allow=${action.Allow}`);
        }
        whitelist[action.Buyer] = action.Allow === "true";
    }

    const outputWhitelist = [];
    for (const key of Object.keys(whitelist)) {
        const value = whitelist[key];

        if (value === true) {
            outputWhitelist.push(key);
        }
    }

    return outputWhitelist;
}

async function main() {
    const argv = await yargs
        .option("whitelistState", {
            alias: "w",
            description: "Already whitelisted addresses",
            type: "string",
        })
        .option("addresses", {
            alias: "a",
            description: "Addresses to be whitelisted",
            type: "string",
        })
        .demandOption(["whitelistState", "addresses"])
        .help()
        .alias("help", "h").argv;

    const whitelistedAddresses = getWhitelistStatus(argv.whitelistState);
    const newAddresses = readFileSync(argv.addresses, "utf8")
        .trim()
        .split(/\r?\n/)
        .map(address => address.toLowerCase());

    const outputWhitelist = [];
    for (const address of newAddresses) {
        if (!whitelistedAddresses.includes(address)) {
            outputWhitelist.push(address);
        }
    }

    console.log(outputWhitelist.join("\n"));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
