"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardApi } from "@/lib/api/endpoints";
import type { DashboardStats } from "@/lib/types";

function useGlobalStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ["global-stats"],
    queryFn: () => dashboardApi.getGlobalStats(),
    staleTime: 60_000,
    retry: 1,
  });
}

const FEATURES = [
  {
    title: "Trade Escrow",
    description:
      "Lock funds before meeting in person. Release with a QR-code handshake — no trust required.",
  },
  {
    title: "Goal Pacts",
    description:
      "Stake collateral against your own commitments. A referee judges your proof and decides the outcome.",
  },
  {
    title: "Trustless Handshake",
    description:
      "QR codes are signed, expiring, and single-use. The pact completes on scan — no manual intervention.",
  },
];

export default function Home() {
  const { data: stats } = useGlobalStats();

  const statCards = [
    ["TVL", stats ? stats.totalValueLockedFormatted : "—"],
    ["Active Escrows", stats ? String(stats.activeEscrows) : "—"],
    ["Completed Trades", stats ? String(stats.completedTrades) : "—"],
    ["Awaiting Verification", stats ? String(stats.awaitingVerification) : "—"],
  ] as const;

  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap space-y-10">
        <div className="space-y-5 text-center">
          <Badge className="mx-auto rounded-full bg-surface-high px-4 py-1 text-xs tracking-[0.2em] text-primary hover:bg-surface-high">
            SafeMeet Protocol
          </Badge>
          <h1 className="font-headline text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Trustless P2P Escrow for Real-World Trades
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
            One escrow primitive, two core flows: high-value in-person trade
            handoffs and self-enforced goal pacts with a referee.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <ConnectButton />
            <Link
              href="/create"
              className={buttonVariants({ variant: "outline", className: "h-10 rounded-lg px-6 font-bold" })}
            >
              Start a Pact
            </Link>
          </div>
        </div>

        {/* Live stats */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(([label, value]) => (
            <Card key={label} className="bg-surface text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                  {label}
                </CardDescription>
                <CardTitle className="font-headline text-3xl font-bold">
                  {value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="bg-surface text-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl font-bold">
                  {f.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                  {f.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
