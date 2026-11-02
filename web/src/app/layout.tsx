import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistMono = localFont({ src: "../fonts/geist-mono-latin.woff2", variable: "--font-geist-mono", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: "Smart Rotary & Tamper Vault",
  description: "Simulated security control center for the Smart Rotary & Tamper Vault.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={geistMono.variable}><body>{children}</body></html>;
}
