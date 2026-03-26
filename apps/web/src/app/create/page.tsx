"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageFrame } from "@/components/page-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePact } from "@/hooks/usePacts";
import { useWallet } from "@/components/providers";
import { CreateTradePactBodySchema } from "@safe-meet/shared";
import type { CreateTradePactBody } from "@safe-meet/shared";

const ASSET_OPTIONS = ["ETH", "USDC", "DAI"] as const;

export default function CreatePage() {
  const router = useRouter();
  const { walletAddress } = useWallet();
  const createPact = useCreatePact();
  const [tradeExpanded, setTradeExpanded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTradePactBody>({
    resolver: zodResolver(CreateTradePactBodySchema),
    defaultValues: {
      type: "TRADE",
      assetSymbol: "ETH",
    },
  });

  const handleStartGoal = () => {
    router.push("/create/goal");
  };

  const onTradeSubmit = async (data: CreateTradePactBody) => {
    try {
      const pact = await createPact.mutateAsync(data);
      toast.success("Trade pact created!");
      router.push(`/escrow/waiting-room?pactId=${pact.id}`);
    } catch {
      toast.error("Failed to create pact");
    }
  };

  return (
    <PageFrame activeHref="/create">
      <motion.section
        className="section-wrap space-y-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3 }}
      >
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Protocol initiation
          </p>
          <h1 className="mt-3 font-headline text-5xl font-bold text-white sm:text-6xl">
            Create SafeMeet
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">
            Pick a path and initialize your pact on-chain.
          </p>
        </header>

        {!walletAddress && (
          <p className="text-center text-sm text-on-surface-variant">
            Connect your wallet to create a pact.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Trade Escrow card */}
          <Card className="relative overflow-hidden bg-surface text-white">
            <div className="sm-glow -top-28 -right-24 h-56 w-56 bg-primary-container/25" />
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                Module 01 - Path A
              </CardDescription>
              <CardTitle className="font-headline text-4xl font-bold">Trade Escrow</CardTitle>
              <CardDescription className="text-on-surface-variant">
                Lock funds, meet in person, and release with a QR-based handshake.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!tradeExpanded ? (
                <Button
                  onClick={() => setTradeExpanded(true)}
                  disabled={!walletAddress}
                  className="h-11 rounded-lg bg-primary-container px-6 text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  Start Trade Pact
                </Button>
              ) : (
                <form onSubmit={handleSubmit(onTradeSubmit)} className="space-y-4">
                  <input type="hidden" {...register("type")} value="TRADE" />

                  {/* Counterparty wallet */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Counterparty Wallet
                    </label>
                    <Input
                      {...register("counterpartyWallet")}
                      placeholder="0x… or name.eth"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    />
                    {errors.counterpartyWallet && (
                      <p className="text-xs text-error">{errors.counterpartyWallet.message}</p>
                    )}
                  </div>

                  {/* Item name */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Item Name
                    </label>
                    <Input
                      {...register("itemName")}
                      placeholder="e.g. MacBook Pro M2"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    />
                    {errors.itemName && (
                      <p className="text-xs text-error">{errors.itemName.message}</p>
                    )}
                  </div>

                  {/* Item description */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Description (optional)
                    </label>
                    <textarea
                      {...register("itemDescription")}
                      placeholder="Brief description of the item..."
                      rows={2}
                      className="w-full rounded-md border border-outline-variant/40 bg-surface-high px-3 py-2 text-sm text-white placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Location (optional)
                    </label>
                    <Input
                      {...register("location")}
                      placeholder="e.g. Starbucks Downtown"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                    />
                  </div>

                  {/* Scheduled at */}
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                      Meetup Time (optional)
                    </label>
                    <Input
                      {...register("scheduledAt")}
                      type="datetime-local"
                      className="h-10 border-outline-variant/40 bg-surface-high text-white"
                    />
                  </div>

                  {/* Asset symbol + amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                        Asset
                      </label>
                      <select
                        {...register("assetSymbol")}
                        className="h-10 w-full rounded-md border border-outline-variant/40 bg-surface-high px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {ASSET_OPTIONS.map((sym) => (
                          <option key={sym} value={sym}>
                            {sym}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                        Amount
                      </label>
                      <Input
                        {...register("assetAmount", { valueAsNumber: true })}
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.0"
                        className="h-10 border-outline-variant/40 bg-surface-high text-white placeholder:text-on-surface-variant"
                      />
                      {errors.assetAmount && (
                        <p className="text-xs text-error">{errors.assetAmount.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTradeExpanded(false)}
                      className="h-11 flex-1 rounded-lg border-outline-variant/40 bg-surface-high text-white hover:bg-surface-highest"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!walletAddress || createPact.isPending}
                      className="h-11 flex-1 rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                    >
                      {createPact.isPending ? "Creating..." : "Create Pact"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Goal Pact card */}
          <Card className="relative overflow-hidden bg-surface text-white">
            <div className="sm-glow -top-28 -right-24 h-56 w-56 bg-secondary-container/25" />
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                Module 02 - Path B
              </CardDescription>
              <CardTitle className="font-headline text-4xl font-bold">Goal Pact</CardTitle>
              <CardDescription className="text-on-surface-variant">
                Stake collateral against your own commitment and let a referee judge proof.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleStartGoal}
                disabled={!walletAddress}
                className="h-11 rounded-lg bg-secondary-container px-6 text-sm font-bold text-white hover:bg-secondary-container/90"
              >
                Start Goal Pact
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </PageFrame>
  );
}
