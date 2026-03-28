"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Html5QrcodeScanner } from "html5-qrcode";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePact, useGenerateQr, useVerifyQr } from "@/hooks/usePacts";
import { getTxExplorerUrl } from "@/lib/chain";

// Dynamically import react-qr-code with no SSR
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

// ------------------------------------------------------------
// Real Html5QrcodeScanner — dynamic import, SSR disabled
// ------------------------------------------------------------

interface ScannerProps {
  onScan: (nonce: string) => void;
  isPending: boolean;
}

function QrScannerSection({ onScan, isPending }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let scanner: Html5QrcodeScanner | null = null;

    async function initScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode");

      scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { fps: 10, qrbox: { width: 220, height: 220 } },
        false
      );

      scanner.render(
        (decodedText: string) => {
          onScan(decodedText);
        },
        (errorMessage: string) => {
          // Suppress frame-level scan errors — they are expected
          void errorMessage;
        }
      );

      scannerRef.current = scanner;
    }

    void initScanner();

    return () => {
      scanner?.clear().catch(() => undefined);
    };
  }, [onScan]);

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-black/60 p-5">
      <div
        id="qr-reader-container"
        ref={containerRef}
        className="overflow-hidden rounded-lg"
      />
      <p className="mt-4 text-center text-sm text-on-surface-variant">
        {isPending ? "Verifying..." : "Point camera at seller QR code"}
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function HandshakePage() {
  const searchParams = useSearchParams();
  const pactId = searchParams.get("pactId") ?? undefined;

  const { data: pact, isLoading } = usePact(pactId);
  const generateQr = useGenerateQr();
  const verifyQr = useVerifyQr();

  const qrData = generateQr.data;

  const handleGenerateQr = () => {
    if (!pactId) return;
    generateQr.mutate(pactId, {
      onSuccess: () => toast.success("QR generated."),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to generate QR."),
    });
  };

  const handleScan = (nonce: string) => {
    if (verifyQr.isPending || verifyQr.isSuccess || !pactId) return;
    verifyQr.mutate(
      { nonce, pactId },
      {
        onSuccess: () => {
          toast.success("Pickup confirmed! Escrow released.");
        },
        onError: () => {
          toast.error("QR verification failed. Please try again.");
        },
      }
    );
  };

  return (
    <PageFrame activeHref="/create">
      <section className="section-wrap grid gap-8 lg:grid-cols-2">

        {/* Seller — QR code */}
        <Card className="bg-surface text-center text-white">
          <CardHeader>
            <Badge className="mx-auto w-fit rounded-full bg-surface-high text-xs uppercase tracking-[0.14em] text-primary">
              Seller perspective
            </Badge>
            <CardTitle className="mt-3 font-headline text-4xl font-bold">The Handshake</CardTitle>
            <CardDescription className="mx-auto max-w-md text-on-surface-variant">
              Show this code to buyer when the item is physically transferred.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* QR display */}
            <div className="mx-auto w-[270px] rounded-2xl bg-white p-4">
              {qrData?.nonce ? (
                <QRCode value={qrData.nonce} size={240} />
              ) : (
                <div className="grid h-[240px] grid-cols-8 gap-1 rounded bg-white p-2">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <span
                      key={i}
                      className={i % 2 === 0 || i % 5 === 0 ? "rounded-sm bg-black" : "rounded-sm bg-white"}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* TX hash */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-high px-4 py-2 text-xs text-on-surface-variant">
              {isLoading
                ? "Loading..."
                : pact?.txHash
                  ? `TX: ${pact.txHash.slice(0, 6)}...${pact.txHash.slice(-4)}`
                  : "TX: Not yet submitted"}
            </div>
            {pact?.txHash && (
              <div className="mt-2">
                <a
                  href={getTxExplorerUrl(pact.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View on BaseScan
                </a>
              </div>
            )}

            {/* Generate QR button */}
            {pactId && !qrData && (
              <div className="mt-4">
                <Button
                  onClick={handleGenerateQr}
                  disabled={generateQr.isPending}
                  className="rounded-lg bg-primary-container text-sm font-bold text-white hover:bg-primary-container/90"
                >
                  {generateQr.isPending ? "Generating..." : "Generate QR Code"}
                </Button>
              </div>
            )}

            {/* QR expiry */}
            {qrData?.expiresAt && (
              <p className="mt-3 text-xs text-on-surface-variant">
                Expires at {format(new Date(qrData.expiresAt), "HH:mm:ss")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Buyer — scan */}
        <Card className="bg-surface text-white">
          <CardHeader>
            <Badge className="w-fit rounded-full bg-surface-high text-xs uppercase tracking-[0.14em] text-secondary-container">
              Buyer perspective
            </Badge>
            <CardTitle className="mt-3 font-headline text-3xl font-bold">Scan and Release</CardTitle>
            <CardDescription className="text-on-surface-variant">
              Scan seller QR to confirm pickup and release escrow directly from contract.
            </CardDescription>

            {/* Pact details */}
            {pact && (
              <div className="mt-3 space-y-1 rounded-lg border border-outline-variant/25 bg-surface-high p-3 text-sm text-on-surface-variant">
                <p><span className="text-white font-medium">Item:</span> {pact.itemName ?? "—"}</p>
                <p><span className="text-white font-medium">Amount:</span> {pact.asset.amountFormatted}</p>
                <p><span className="text-white font-medium">Counterparty:</span> {pact.counterpartyWallet}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {verifyQr.isSuccess ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                <p className="text-lg font-bold text-emerald-400">Pickup Confirmed!</p>
                <p className="mt-1 text-sm text-on-surface-variant">Escrow has been released.</p>
              </div>
            ) : (
              <QrScannerSection onScan={handleScan} isPending={verifyQr.isPending} />
            )}

            {/* Error */}
            {verifyQr.isError && (
              <p className="mt-3 text-sm text-error">
                Verification failed. Please try again.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </PageFrame>
  );
}
