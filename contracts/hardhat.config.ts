import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "0x" + "1".repeat(64);
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      ...(process.env.FORK
        ? { forking: { url: "https://forno.celo.org" } }
        : {}),
      chainId: 31337,
    },
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 44787,
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: [PRIVATE_KEY],
      chainId: 42220,
    },
    "celo-sepolia": {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 11142220,
    },
  },
  etherscan: {
    // Etherscan v2 unified API — one key works across all supported chains.
    apiKey: CELOSCAN_API_KEY,
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: { apiURL: "https://api.etherscan.io/v2/api", browserURL: "https://celoscan.io" },
      },
      {
        network: "alfajores",
        chainId: 44787,
        urls: { apiURL: "https://api.etherscan.io/v2/api", browserURL: "https://alfajores.celoscan.io" },
      },
      {
        network: "celo-sepolia",
        chainId: 11142220,
        urls: { apiURL: "https://api.etherscan.io/v2/api", browserURL: "https://sepolia.celoscan.io" },
      },
    ],
  },
  gasReporter: { enabled: true },
  typechain: { outDir: "typechain-types", target: "ethers-v6" },
};

export default config;
