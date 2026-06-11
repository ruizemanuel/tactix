import { ethers, network } from "hardhat";

// Dev utility: print the configured deployer address + native CELO balance on a
// given network, to decide where to deploy. NEVER prints the private key.
async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`network=${network.name} deployer=${deployer.address} balanceCELO=${ethers.formatEther(bal)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
