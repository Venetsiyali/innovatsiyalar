import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { t } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.fullName"),
};

export const viewport: Viewport = { themeColor: "#1e3a8a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
