import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Al-Futtaim Home Concierge | A home, considered",
  description: "A prototype that helps UAE residents discover relevant home setup options.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}