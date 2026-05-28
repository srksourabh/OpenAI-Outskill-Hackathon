import type { Metadata } from "next";
import { AppShellHeader } from "./app-shell-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "eDial | Autonomous Calling Agent",
    template: "%s | eDial"
  },
  description:
    "eDial is an autonomous outbound calling platform with campaign control, agent prompt tuning, health monitoring, and call outcome exports for operations teams.",
  keywords: [
    "autonomous calling agent",
    "outbound call campaign",
    "AI voice agent",
    "call center automation",
    "campaign analytics",
    "call transcript tracking"
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShellHeader />
        {children}
      </body>
    </html>
  );
}
