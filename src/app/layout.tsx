import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Fraunces } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "duet — take photos together, apart",
  description:
    "collaborative photo booth for friends who are far apart. on-device portrait segmentation, shared backgrounds, unified color grading.",
  openGraph: {
    title: "duet",
    description: "take photos together, even when you are apart",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "duet",
    description: "take photos together, even when you are apart",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F5F2EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-[#D4A574]/20">
        {children}
      </body>
    </html>
  );
}
