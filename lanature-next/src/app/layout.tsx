import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaNature Hotel — Luxury Dining & Hospitality",
  description: "Experience luxury hospitality at LaNature Hotel. Fine dining, world-class spa, infinity pool, and exquisite rooms await you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
