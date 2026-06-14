import { ethers } from "hardhat";

// Post-deploy ops for a TegPool.
//   POOL=0x… ORACLE=0x… [SEED_AMOUNT=5000000] [EXECUTE=true] \
//   pnpm -C contracts exec hardhat run scripts/post-deploy.ts --network <celo|celo-sepolia>
// Prints owner-only calldata (setOracle, optional seedPool) to paste into the Safe.
// If EXECUTE=true AND the signer is the owner, runs setOracle directly (testnet convenience).
const POOL = process.env.POOL ?? "";
const ORACLE = process.env.ORACLE ?? "";
const SEED_AMOUNT = process.env.SEED_AMOUNT; // USDT atomic units (1 USDT = 1_000_000)

async function main() {
  if (!ethers.isAddress(POOL) || !ethers.isAddress(ORACLE)) {
    throw new Error("Set POOL and ORACLE to valid addresses");
  }
  const pool = await ethers.getContractAt("TegPool", POOL);
  const [signer] = await ethers.getSigners();
  const owner: string = await pool.owner();

  console.log("pool:        ", POOL);
  console.log("current owner:", owner);
  console.log("current oracle:", await pool.oracle());
  console.log("signer:      ", signer.address);

  const setOracleData = pool.interface.encodeFunctionData("setOracle", [ORACLE]);
  console.log("\n=== Safe tx — setOracle (owner-only) ===");
  console.log("to:    ", POOL);
  console.log("value: 0");
  console.log("data:  ", setOracleData);

  if (SEED_AMOUNT) {
    const seedData = pool.interface.encodeFunctionData("seedPool", [BigInt(SEED_AMOUNT)]);
    console.log("\n=== Safe tx — seedPool (owner-only; the Safe must approve USDT first) ===");
    console.log("to:    ", POOL);
    console.log("value: 0");
    console.log("data:  ", seedData);
  }

  if (process.env.EXECUTE === "true") {
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("\nEXECUTE skipped — signer is not the owner; use the Safe calldata above.");
    } else {
      await (await pool.setOracle(ORACLE)).wait();
      console.log("\nsetOracle executed. new oracle:", await pool.oracle());
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
