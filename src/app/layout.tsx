import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import VersionSwitcher from "@/components/VersionSwitcher";
import "./globals.css";

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KeePer PRO SHOP｜カーコーティング専門店",
  description: "全国91店舗のKeePer認定カーコーティング専門店。Web予約限定割引あり。",
  openGraph: {
    images: [{ url: '/images/keeper-logo.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSerif.variable} antialiased`}>
      <body className="min-h-screen font-sans">
        {children}
        <VersionSwitcher />
      </body>
    </html>
  );
}
