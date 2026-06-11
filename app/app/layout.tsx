import type { Metadata } from "next";
import { Saira, Saira_Condensed, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider.js";
import { Providers } from "./providers.js";

const bodyFont = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const displayFont = Saira({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-saira" });
const condFont = Saira_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-saira-cond" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "TACTIX — Conquer. Never lose.",
  description:
    "TACTIX — a turn-based war-strategy game inspired by TEG. Conquer the board, never lose your deposit. Play vs AI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${bodyFont.variable} ${displayFont.variable} ${condFont.variable} ${monoFont.variable}`}
    >
      <body className="min-h-full">
        <Providers>
          <I18nProvider>{children}</I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
