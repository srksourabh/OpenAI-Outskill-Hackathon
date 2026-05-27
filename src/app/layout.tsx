import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outbound AI Calling Agent",
  description: "Hindi-first outbound AI calling campaign workspace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
