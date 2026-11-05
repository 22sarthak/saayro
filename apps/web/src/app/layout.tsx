import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { createCssVariables } from "@saayro/ui";
import { SessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "wdth"],
  display: "swap"
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Saayro — Your trip's smarter half",
  description: "Plan, gather and live every trip across India with your people, in one beautiful place."
};

export const viewport: Viewport = {
  themeColor: "#f7f8fa"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const cssVariables = {
    ...createCssVariables(),
    "--saayro-font-display": "var(--font-display)",
    "--saayro-font-body": "var(--font-body)"
  } as CSSProperties;

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body style={cssVariables} className="font-body text-slate-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
