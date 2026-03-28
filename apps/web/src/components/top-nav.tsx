"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LogoIcon } from "@/components/logo-icon";
import { NotificationsMenu } from "@/components/notifications-menu";
import { useWallet } from "@/components/providers";
import { hasAuthToken } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const APP_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/create", label: "Escrow" },
  { href: "/settings", label: "Settings" },
];

const PUBLIC_NAV_ITEMS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/docs", label: "Docs" },
];

export type TopNavProps = {
  activeHref: string | undefined;
};

export function TopNav({ activeHref }: TopNavProps) {
  const { walletAddress, isConnected } = useWallet();
  const [authed, setAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setAuthed(hasAuthToken());
    const onStorage = () => setAuthed(hasAuthToken());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const walletLabel = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : "";

  const navItems = authed ? APP_NAV_ITEMS : PUBLIC_NAV_ITEMS;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-background/85 backdrop-blur-xl">
      <div className="section-wrap flex h-[4.5rem] items-center justify-between gap-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-surface-high text-primary-container shadow-[0_0_35px_-18px_#7d56fe]"
          aria-label="SafeMeet home"
        >
          <LogoIcon className="h-6 w-6" />
          <span className="sr-only">SafeMeet</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-semibold tracking-wide transition-colors",
                activeHref === item.href
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 md:flex">
          {authed ? (
            <>
              <NotificationsMenu />
              {walletAddress && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {walletLabel}
                </span>
              )}
              <ConnectButton />
            </>
          ) : isConnected ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {walletLabel}
              </span>
              <Link
                href="/connect"
                className={buttonVariants({ className: "h-9 rounded-lg px-5 text-sm font-bold" })}
              >
                Sign In
              </Link>
            </>
          ) : (
            <Link
              href="/connect"
              className={buttonVariants({ className: "h-9 rounded-lg px-5 text-sm font-bold" })}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Launch App
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-surface text-white md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/8 bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-sm font-semibold",
                  activeHref === item.href ? "text-primary" : "text-on-surface-variant"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 space-y-3">
            {authed ? (
              <ConnectButton />
            ) : isConnected ? (
              <Link
                href="/connect"
                onClick={() => setMobileOpen(false)}
                className={buttonVariants({ className: "w-full justify-center text-sm font-bold" })}
              >
                Sign In
              </Link>
            ) : (
              <Link
                href="/connect"
                onClick={() => setMobileOpen(false)}
                className={buttonVariants({ className: "w-full justify-center text-sm font-bold" })}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Launch App
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
