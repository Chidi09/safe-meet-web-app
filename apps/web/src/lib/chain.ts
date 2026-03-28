const CHAIN_EXPLORER_BASE: Record<number, string> = {
  84532: "https://sepolia.basescan.org",
};

export function getTxExplorerUrl(txHash: string, chainId = 84532): string {
  const base = CHAIN_EXPLORER_BASE[chainId] ?? CHAIN_EXPLORER_BASE[84532];
  return `${base}/tx/${txHash}`;
}
