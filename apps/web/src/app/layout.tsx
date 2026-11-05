import type { CSSProperties, ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { createCssVariables } from "@saayro/ui";
import { SessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
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
  themeColor: "#fffbf5"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const cssVariables = {
    ...createCssVariables(),
    "--saayro-font-display": "var(--font-display)",
    "--saayro-font-body": "var(--font-body)"
  } as CSSProperties;

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body style={cssVariables} className="font-body text-ink-950 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
