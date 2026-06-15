import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const artifactPath = resolve(here, "../../contracts/artifacts/contracts/TegPool.sol/TegPool.json");
const outPath = resolve(here, "../lib/contracts/tegPool.ts");

let artifact;
try {
  artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
} catch {
  console.error(`Cannot read ${artifactPath}\nCompile the contracts first: pnpm -C contracts build`);
  process.exit(1);
}

const header =
  "// AUTO-GENERATED from contracts/artifacts/contracts/TegPool.sol/TegPool.json — run `pnpm gen:abi` after contract changes.";
const body = `export const tegPoolAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
writeFileSync(outPath, `${header}\n${body}`);
console.log(`Wrote ${outPath} (${artifact.abi.length} ABI entries).`);
