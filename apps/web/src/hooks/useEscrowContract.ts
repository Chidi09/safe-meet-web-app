import { parseEther } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { ESCROW_CONTRACT_ADDRESS, escrowContractAbi, pactIdToBytes32 } from "@/lib/escrow-contract";

type LockFundsInput = {
  pactId: string;
  counterpartyWallet: `0x${string}`;
  amountEth: number;
};

export function useEscrowContract() {
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const lockFunds = async ({ pactId, counterpartyWallet, amountEth }: LockFundsInput): Promise<`0x${string}`> => {
    if (!ESCROW_CONTRACT_ADDRESS) {
      throw new Error("Missing NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS.");
    }

    if (!publicClient) {
      throw new Error("Public client unavailable.");
    }

    if (amountEth <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const txHash = await writeContractAsync({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: escrowContractAbi,
      functionName: "lockFunds",
      args: [pactIdToBytes32(pactId), counterpartyWallet],
      value: parseEther(String(amountEth)),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  };

  return { lockFunds, isPending };
}
