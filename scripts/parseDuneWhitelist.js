const { readFileSync } = require("fs");
const { parse } = require("csv-parse/sync");
const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("file", {
            alias: "f",
            description: "File with the whitelist data in CSV format",
            type: "string",
        })
        .option("showall", {
            alias: "a",
            description: "Show all entries, including the not whitelisted addresses",
            type: "boolean",
        })
        .demandOption(["file"])
        .help()
        .alias("help", "h").argv;

    const whitelistCSV = readFileSync(argv.file);
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
    for (const key of Object.keys(whitelist)) {
        const value = whitelist[key];

        if (argv.showall) {
            console.log(`${key},${value}`);
        } else if (value === true) {
            console.log(`${key}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
