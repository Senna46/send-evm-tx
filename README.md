# EVM Transaction Broadcaster

This script reads a CSV file containing wallet addresses, amounts, chains, and tokens, then broadcasts transactions to the specified EVM-compatible networks. The results of each transaction (including the transaction hash) are saved to a new CSV file.

## Features

- Send native tokens (ETH, BNB) and ERC20 tokens (USDC, USDT).
- Support for multiple networks: Ethereum, BNB Smart Chain, Base, and Sepolia testnet.
- Reads transaction data from a CSV file.
- Saves transaction results, including hashes, to a separate CSV file.
- Uses environment variables for secure management of mnemonics and RPC URLs.

## Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Senna46/send-evm-tx.git
    cd send-evm-tx
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create and configure the environment file:**

    - Copy the example environment file:
      ```bash
      cp .env.example .env
      ```
    - Open the `.env` file and fill in your details:
      - `MNEMONIC`: Your 12 or 24-word mnemonic phrase for the wallet you want to send from. **Keep this secret!**
      - `INPUT_CSV_PATH`: The path to the input CSV file containing transaction data.
      - `BNB_RPC_URL`, `ETH_RPC_URL`, `BASE_RPC_URL`, `SEPOLIA_RPC_URL`: Your RPC endpoint URLs. You can get one from services like [Infura](https://infura.io/).

4.  **Prepare the input CSV file:**
    - Ensure your input CSV file is located at the path specified in `INPUT_CSV_PATH`.
    - The CSV file must have the following columns: `EVM_WALLET_ADDRESS`, `AMOUNT`, `CHAIN`, `TOKEN`.

## Usage

Once the setup is complete, run the script with the following command:

```bash
npm start
```

The script will process each row in the input CSV file and attempt to send the specified amount of tokens.

## Output

The results of the transactions will be saved in `results.csv` in the project's root directory. The output file will contain the following columns: `EVM_WALLET_ADDRESS`, `AMOUNT`, `CHAIN`, `TX_HASH`. If a transaction fails, the `TX_HASH` will be marked as 'FAILED'.
