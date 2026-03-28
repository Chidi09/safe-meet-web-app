import { keccak256, stringToHex } from "viem";

export const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const escrowContractAbi = [
  {
    type: "function",
    name: "lockFunds",
    stateMutability: "payable",
    inputs: [
      { name: "pactId", type: "bytes32" },
      { name: "counterparty", type: "address" },
    ],
    outputs: [],
  },
] as const;

export function pactIdToBytes32(pactId: string): `0x${string}` {
  return keccak256(stringToHex(pactId));
}
