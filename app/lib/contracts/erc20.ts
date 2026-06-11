import { erc20Abi } from "viem";

export { erc20Abi };

// MockUSDT (testnet only) exposes a public mint(to, amount). Used by the
// "mint test USDT" helper so users can fund a testnet join without a faucet.
export const mockUsdtMintAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
