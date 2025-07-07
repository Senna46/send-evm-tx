// This script reads transaction data from a CSV file, sends tokens on different EVM chains,
// and records the transaction results to another CSV file.
// It handles transactions for ETH, USDC, and USDT on Ethereum, BNB Chain, and Base Chain.

import { ethers, Wallet, Provider, Contract } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";

dotenv.config();

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    throw new Error("MNEMONIC not found in .env file");
}

const inputCsvPath = process.env.INPUT_CSV_PATH;
if (!inputCsvPath) {
    throw new Error("INPUT_CSV_PATH not found in .env file");
}

const rpcUrls: { [key: string]: string } = {
    bnb: process.env.BNB_RPC_URL || "",
    ethereum: process.env.ETH_RPC_URL || "",
    base: process.env.BASE_RPC_URL || "",
    sepolia: process.env.SEPOLIA_RPC_URL || "",
};

if (!rpcUrls.bnb || !rpcUrls.ethereum || !rpcUrls.base) {
    throw new Error("RPC URL not found in .env file");
}

// ERC20 ABI for token transfers
const erc20Abi = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
];

const tokenAddresses: { [key: string]: { [key: string]: string } } = {
    ethereum: {
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        eth: "", // Native currency
    },
    bnb: {
        usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        usdt: "0x55d398326f99059fF775485246999027B3197955",
        eth: "", // This should be bnb, but we use 'eth' for native currency symbol in ethers
    },
    base: {
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        eth: "", // Native currency
    },
    sepolia: {
        usdc: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        eth: "", // Native currency
    },
};

interface TransactionData {
    USER_ID: string;
    EVM_WALLET_ADDRESS: string;
    EMAIL: string;
    AMOUNT: string;
    CHAIN: string;
    TOKEN: string;
}

const getProvider = (chain: string): Provider => {
    const url = rpcUrls[chain.toLowerCase()];
    if (!url) {
        throw new Error(`Unsupported chain: ${chain}`);
    }
    return new ethers.JsonRpcProvider(url);
};

const sendTransaction = async (data: TransactionData) => {
    try {
        const provider = getProvider(data.CHAIN);
        const wallet = Wallet.fromPhrase(mnemonic).connect(provider);

        let tx;
        const isNative =
            data.TOKEN.toLowerCase() === "eth" ||
            (data.CHAIN.toLowerCase() === "bnb" &&
                data.TOKEN.toLowerCase() === "bnb");

        if (isNative) {
            const amount = ethers.parseEther(data.AMOUNT);
            tx = await wallet.sendTransaction({
                to: data.EVM_WALLET_ADDRESS,
                value: amount,
            });
        } else {
            const tokenAddress =
                tokenAddresses[data.CHAIN.toLowerCase()]?.[data.TOKEN.toLowerCase()];
            if (!tokenAddress) {
                throw new Error(
                    `Token ${data.TOKEN} on chain ${data.CHAIN} is not supported.`
                );
            }
            const tokenContract = new Contract(tokenAddress, erc20Abi, wallet);
            const decimals = await tokenContract.decimals();
            const amount = ethers.parseUnits(data.AMOUNT, decimals);
            tx = await tokenContract.transfer(data.EVM_WALLET_ADDRESS, amount);
        }

        const receipt = await tx.wait();

        if (!receipt) {
            throw new Error("Transaction receipt is null");
        }

        console.log(`Transaction successful with hash: ${receipt.hash}`);
        return receipt.hash;
    } catch (error) {
        const errorMessage = `Error sending transaction for ${data.EVM_WALLET_ADDRESS
            }. Address: ${data.EVM_WALLET_ADDRESS}, Amount: ${data.AMOUNT}, Chain: ${data.CHAIN
            }, Token: ${data.TOKEN}. Error: ${error instanceof Error ? error.message : String(error)
            }`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
};

const readCsv = (filePath: string): Promise<TransactionData[]> => {
    return new Promise((resolve, reject) => {
        const results: TransactionData[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (error) => reject(error));
    });
};

const main = async () => {
    const now = new Date();
    const outputCsvPath = `results_${now.toISOString()}.csv`;

    const csvWriter = createObjectCsvWriter({
        path: outputCsvPath,
        header: [
            { id: "address", title: "EVM_WALLET_ADDRESS" },
            { id: "amount", title: "AMOUNT" },
            { id: "chain", title: "CHAIN" },
            { id: "token", title: "TOKEN" },
            { id: "txHash", title: "TX_HASH" },
        ]
    });

    const allRows = await readCsv(inputCsvPath);

    for (const row of allRows) {
        try {
            // Skip rows with empty wallet address or amount
            if (!row.EVM_WALLET_ADDRESS || !row.AMOUNT) {
                console.log("Skipping row with empty address or amount:", row);
                continue;
            }

            const txHash = await sendTransaction(row);
            const result = {
                address: row.EVM_WALLET_ADDRESS,
                amount: row.AMOUNT,
                chain: row.CHAIN,
                token: row.TOKEN,
                txHash: txHash,
            };
            await csvWriter.writeRecords([result]);
        } catch (error) {
            console.error(`Failed to process transaction for row:`, row, error);
            const errorResult = {
                address: row.EVM_WALLET_ADDRESS,
                amount: row.AMOUNT,
                chain: row.CHAIN,
                token: row.TOKEN,
                txHash: "FAILED",
            };
            await csvWriter.writeRecords([errorResult]);
        }
    }

    console.log("CSV file successfully processed.");
};

main().catch((error) => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
});
