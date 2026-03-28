"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Lock, QrCode, ShieldCheck, ArrowRight, Zap, Users, Target, CheckCircle } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    icon: Lock,
    title: "Trade Escrow",
    description: "Lock funds before meeting. Release with a QR-code handshake — no blind trust.",
  },
  {
    icon: Target,
    title: "Goal Pacts",
    description: "Stake collateral on your own commitments. A referee judges proof and decides the outcome.",
  },
  {
    icon: QrCode,
    title: "Trustless Handshake",
    description: "QR codes are signed, expiring, and single-use. Pact completes on scan automatically.",
  },
];

const FLOW = [
  {
    step: "01",
    icon: Users,
    title: "Create A Pact",
    text: "Define terms, counterparties, and amount. Lock collateral on Base Sepolia.",
  },
  {
    step: "02",
    icon: ArrowRight,
    title: "Share & Accept",
    text: "Send the pact link via WhatsApp or Telegram. Counterparty connects and accepts.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Verify & Complete",
    text: "Scan QR at handoff for trades. Submit proof for goals — referee decides.",
  },
];

function EscrowDiagram() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-0 overflow-hidden rounded-2xl border border-white/10 bg-surface-high p-8 select-none">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-48 rounded-full bg-primary-container/10 blur-3xl" />
      </div>
      <div className="relative z-10 flex w-full max-w-xs items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-container/20 text-secondary-container">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Party A</p>
          <p className="font-mono text-xs text-white/50">0x71a3…f92c</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400">Ready</span>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center py-2">
        <div className="h-6 w-px bg-gradient-to-b from-white/20 to-primary-container/60" />
        <p className="my-1 rounded-full border border-primary-container/30 bg-primary-container/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">Lock Collateral ↓</p>
        <div className="h-6 w-px bg-gradient-to-b from-primary-container/60 to-white/20" />
      </div>
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-2 rounded-xl border border-primary-container/40 bg-surface p-4 shadow-[0_0_30px_-10px_#7d56fe]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-container/30 bg-primary-container/20 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Escrow Vault</p>
          <p className="font-headline text-2xl font-bold text-white">0.5 ETH</p>
          <p className="text-[10px] text-on-surface-variant">Locked on Flow EVM</p>
        </div>
        <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/8 bg-surface-high px-3 py-1.5">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-medium text-emerald-400">Smart contract secured</span>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center py-2">
        <div className="h-6 w-px bg-gradient-to-b from-white/20 to-secondary-container/60" />
        <p className="my-1 rounded-full border border-secondary-container/30 bg-secondary-container/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary-container">QR Handshake ↓</p>
        <div className="h-6 w-px bg-gradient-to-b from-secondary-container/60 to-white/20" />
      </div>
      <div className="relative z-10 flex w-full max-w-xs items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-container/20 text-secondary-container">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Party B</p>
          <p className="font-mono text-xs text-white/50">0xb4e1…a31d</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <QrCode className="h-3.5 w-3.5 text-on-surface-variant" />
          <span className="text-xs text-on-surface-variant">Awaiting scan</span>
        </div>
      </div>
    </div>
  );
}

function IPhoneMockup() {
  return (
    <div className="relative flex h-full min-h-[480px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-high py-8">
      {/* Ambient glow behind phone */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-80 w-64 rounded-full bg-primary-container/20 blur-3xl" />
      </div>

      {/* iPhone shell */}
      <div className="relative z-10 flex flex-col" style={{ width: 220 }}>
        {/* Phone body */}
        <div
          className="relative overflow-hidden rounded-[38px] border-[6px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_32px_64px_-16px_rgba(0,0,0,0.8)]"
          style={{
            borderColor: "#1c1c1e",
            background: "#000",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px -20px rgba(0,0,0,0.9)",
          }}
        >
          {/* Side buttons (left) */}
          <div className="absolute -left-[8px] top-[72px] h-8 w-[4px] rounded-l-full bg-[#2a2a2a]" />
          <div className="absolute -left-[8px] top-[112px] h-12 w-[4px] rounded-l-full bg-[#2a2a2a]" />
          <div className="absolute -left-[8px] top-[136px] h-12 w-[4px] rounded-l-full bg-[#2a2a2a]" />
          {/* Power button (right) */}
          <div className="absolute -right-[8px] top-[100px] h-16 w-[4px] rounded-r-full bg-[#2a2a2a]" />

          {/* Screen bezel top */}
          <div className="relative bg-black px-0 pt-0">
            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-[10px] z-20 h-[14px] w-[60px] -translate-x-1/2 rounded-full bg-black" />

            {/* Screenshot */}
            <Image
              src="/illustrations/app-mobile-screenshot.png"
              alt="SafeMeet app on mobile"
              width={390}
              height={844}
              className="w-full"
              style={{ display: "block", borderRadius: "32px" }}
              priority
            />
          </div>
        </div>

        {/* Reflection / label */}
        <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Live on Flow EVM & Base
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: stats } = useGlobalStats();

  const statCards = [
    { label: "TVL", value: stats ? stats.totalValueLockedFormatted : "—", accent: "text-primary" },
    { label: "Active Escrows", value: stats ? String(stats.activeEscrows) : "—", accent: "text-secondary-container" },
    { label: "Completed Trades", value: stats ? String(stats.completedTrades) : "—", accent: "text-emerald-400" },
    { label: "Awaiting Verification", value: stats ? String(stats.awaitingVerification) : "—", accent: "text-amber-400" },
  ];

  return (
    <PageFrame activeHref={undefined}>
      <section className="section-wrap space-y-14 pb-10">

        {/* ── Hero ── */}
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <div className="flex flex-col justify-center space-y-6 rounded-2xl border border-white/10 bg-surface p-6 sm:p-10">
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs tracking-[0.2em] text-primary hover:bg-primary/10">
              SafeMeet Protocol · Base Sepolia
            </Badge>
            <h1 className="font-headline text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Escrow For<br />
              <span className="text-primary">High-Stakes</span><br />
              Trades & Pacts
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-on-surface-variant sm:text-base">
              Lock collateral before you meet. Release only after a signed QR handshake or referee approval. No blind trust — ever.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/connect"
                className={buttonVariants({ className: "h-11 rounded-xl px-7 font-bold text-sm" })}
              >
                <Zap className="mr-2 h-4 w-4" />
                Launch App
              </Link>
              <Link
                href="/how-it-works"
                className={buttonVariants({ variant: "outline", className: "h-11 rounded-xl px-7 font-bold text-sm" })}
              >
                How It Works
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
              {["Gasless sign-in", "Non-custodial", "Open source"].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <IPhoneMockup />
        </div>

        {/* ── How it flows ── */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Three steps to trustless completion
          </p>
          <div className="relative grid gap-5 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div className="absolute left-[33%] right-[33%] top-8 hidden h-px bg-gradient-to-r from-white/0 via-white/15 to-white/0 md:block" />

            {FLOW.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.step} className="relative bg-surface text-white">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-3xl font-bold text-white/10">{step.step}</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface-high text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <CardTitle className="font-headline text-lg font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                      {step.text}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Escrow diagram ── */}
        <div className="mx-auto w-full max-w-sm">
          <EscrowDiagram />
        </div>

        {/* ── Live stats ── */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Live protocol stats
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(({ label, value, accent }) => (
              <Card key={label} className="bg-surface text-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                    {label}
                  </CardDescription>
                  <CardTitle className={`font-headline text-3xl font-bold ${accent}`}>
                    {value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Feature highlights ── */}
        <div>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.25em] text-on-surface-variant">
            Protocol features
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="group bg-surface text-white transition-colors hover:border-white/20">
                  <CardHeader>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="font-headline text-xl font-bold">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
                      {f.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── CTA banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary-container/30 bg-surface p-8 text-center shadow-[0_0_60px_-20px_#7d56fe] sm:p-12">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-primary-container/15 blur-3xl" />
          </div>
          <div className="relative z-10 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Ready to meet safely?
            </p>
            <h2 className="font-headline text-3xl font-bold text-white sm:text-4xl">
              No trust required.<br />Just a wallet and a pact.
            </h2>
            <p className="mx-auto max-w-md text-sm text-on-surface-variant">
              Create your first escrow pact in under two minutes. Built on Base Sepolia for the Base Buildathon.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/connect"
                className={buttonVariants({ className: "h-11 rounded-xl px-8 font-bold text-sm" })}
              >
                Get Started Free
              </Link>
              <Link
                href="/how-it-works"
                className={buttonVariants({ variant: "outline", className: "h-11 rounded-xl px-8 font-bold text-sm" })}
              >
                See the flow
              </Link>
            </div>
          </div>
        </div>

      </section>
    </PageFrame>
  );
}
