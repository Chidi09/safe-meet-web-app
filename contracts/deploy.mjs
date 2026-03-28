#!/usr/bin/env node
// ============================================================
// contracts/deploy.mjs
// Deploy SafeMeetEscrow to Base Sepolia in one command.
//
// Usage:
//   PRIVATE_KEY=0x... node contracts/deploy.mjs
//
// Optional env:
//   BASE_SEPOLIA_RPC  — override default public RPC
//
// After deploy, add the printed address to .env.web:
//   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x...
// ============================================================

import { readFileSync } from "fs";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import solc from "solc";

// ── 1. Read and compile the contract ──────────────────────────

const source = readFileSync(new URL("./src/SafeMeetEscrow.sol", import.meta.url), "utf8");

const input = {
  language: "Solidity",
  sources: { "SafeMeetEscrow.sol": { content: source } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
};

process.stdout.write("Compiling SafeMeetEscrow.sol…  ");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors?.some((e) => e.severity === "error")) {
  console.error("\nCompilation errors:");
  output.errors.forEach((e) => console.error(" ", e.formattedMessage));
  process.exit(1);
}

const contract = output.contracts["SafeMeetEscrow.sol"]["SafeMeetEscrow"];
const abi = contract.abi;
const bytecode = "0x" + contract.evm.bytecode.object;
console.log("done");

// ── 2. Set up viem clients ─────────────────────────────────────

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("Error: PRIVATE_KEY env var is required.\n  PRIVATE_KEY=0x... node contracts/deploy.mjs");
  process.exit(1);
}

const rpcUrl = process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const account = privateKeyToAccount(privateKey);

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(rpcUrl),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
});

// ── 3. Deploy ──────────────────────────────────────────────────

console.log(`Deploying from: ${account.address}`);
console.log(`RPC:            ${rpcUrl}`);
process.stdout.write("Sending deploy tx…  ");

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [],
});

console.log(`tx: ${hash}`);
process.stdout.write("Waiting for receipt…  ");

const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;

if (!address) {
  console.error("Deploy failed — no contract address in receipt.");
  process.exit(1);
}

console.log("done\n");
console.log("═══════════════════════════════════════════════════");
console.log("  SafeMeetEscrow deployed!");
console.log(`  Address:  ${address}`);
console.log(`  Block:    ${receipt.blockNumber}`);
console.log(`  Explorer: https://sepolia.basescan.org/address/${address}`);
console.log("═══════════════════════════════════════════════════\n");
console.log("Next: add to your .env.web (and VPS .env.web):");
console.log(`  NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${address}\n`);
