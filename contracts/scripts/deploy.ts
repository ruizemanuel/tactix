import { ethers, network, run } from "hardhat";

// Celo mainnet addresses (same ones Onze/celo-may uses in production; the aUSDT
// contract backs ~7.4M USDT). RE-VERIFY on Celoscan / via Celopedia before a mainnet deploy.
const MAINNET = {
  usdt: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  aUsdt: "0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df",
  aavePool: "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const isMainnet = network.name === "celo";
  console.log(`Network: ${network.name}  Deployer: ${deployer.address}`);

  let usdt: string, aUsdt: string, aavePool: string;
  if (isMainnet) {
    ({ usdt, aUsdt, aavePool } = MAINNET);
  } else {
    const Usdt = await (await ethers.getContractFactory("MockUSDT")).deploy();
    const AUsdt = await (await ethers.getContractFactory("MockAUsdt")).deploy();
    const Aave = await (await ethers.getContractFactory("MockAavePool")).deploy(await Usdt.getAddress(), await AUsdt.getAddress());
    usdt = await Usdt.getAddress();
    aUsdt = await AUsdt.getAddress();
    aavePool = await Aave.getAddress();
    console.log(`Mocks → USDT ${usdt}  aUSDT ${aUsdt}  Aave ${aavePool}`);
  }

  const platformWallet = process.env.PLATFORM_WALLET ?? deployer.address;
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const lockTime = now + 60 * 60;             // +1h (tune per tournament)
  const endTime = lockTime + 7 * 24 * 60 * 60; // +7d
  const deposit = 1_000_000n;                  // 1 USDT (6 decimals)
  const feeBps = 1000;                         // 10%

  const args = [usdt, aavePool, aUsdt, platformWallet, lockTime, endTime, deposit, 1n, "TACTIX-1", feeBps, deployer.address] as const;
  const pool = await (await ethers.getContractFactory("TegPool")).deploy(...args);
  await pool.waitForDeployment();
  const addr = await pool.getAddress();
  console.log(`TegPool deployed → ${addr}`);
  console.log("Verify args:", JSON.stringify(args.map(String)));

  if (isMainnet || network.name === "alfajores") {
    console.log("Waiting for confirmations before verify…");
    await pool.deploymentTransaction()?.wait(5);
    try {
      await run("verify:verify", { address: addr, constructorArguments: [...args] });
      console.log("Verified on Celoscan.");
    } catch (e) {
      console.warn("Verify failed (run manually):", e);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
