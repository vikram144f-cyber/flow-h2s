import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLOW | Transit Network Intelligence",
  description: "A deterministic simulation for resilient multimodal transit routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
