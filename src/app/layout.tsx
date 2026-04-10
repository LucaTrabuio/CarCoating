import type { Metadata } from "next";
import { Noto_Serif_JP, Noto_Sans_JP, M_PLUS_Rounded_1c, Zen_Maru_Gothic, Shippori_Mincho, Kosugi_Maru } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const mplusRounded = M_PLUS_Rounded_1c({
  variable: "--font-m-plus-rounded-1c",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const kosugiMaru = Kosugi_Maru({
  variable: "--font-kosugi-maru",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const fontVariables = [
  notoSerif.variable,
  notoSans.variable,
  mplusRounded.variable,
  zenMaru.variable,
  shipporiMincho.variable,
  kosugiMaru.variable,
].join(' ');

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
    <html lang="ja" className={`${fontVariables} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
