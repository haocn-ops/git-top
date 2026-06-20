import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Git.Top | GitHub Knowledge Layer for AI Agents",
  description: "Agent-friendly open source project knowledge, search, alternatives, deployment signals, and quality scores."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
