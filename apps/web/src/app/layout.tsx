import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import "./globals.css";

const headline = Space_Grotesk({
  variable: "--font-headline",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://safemeet.xyz"),
  title: "SafeMeet",
  description: "SafeMeet escrow and pact dashboard",
  openGraph: {
    title: "SafeMeet",
    description: "Trustless escrow and pact dashboard on Base Sepolia.",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeMeet",
    description: "Trustless escrow and pact dashboard on Base Sepolia.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full dark", headline.variable, body.variable, "font-sans")}
    >
      <body className="min-h-full bg-background text-on-surface font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
