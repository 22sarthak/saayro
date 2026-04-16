import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { semanticTokens } from "@saayro/tokens";
import { createCssVariables } from "@saayro/ui";
import { SessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saayro",
  description: "Your trip's smarter half"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const cssVariables = {
    ...createCssVariables(),
    "--saayro-font-display": semanticTokens.typography.fonts.display,
    "--saayro-font-body": semanticTokens.typography.fonts.body
  } as CSSProperties;

  return (
    <html lang="en">
      <body
        style={cssVariables}
        className="bg-[var(--saayro-surface-base)] font-[var(--saayro-font-body)] text-[var(--saayro-text-primary)] antialiased"
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
