import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import LocaleProvider from "@/components/locale-provider";
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
  title: "Duet - Korean photo booth for two",
  description:
    "A mobile Korean-style photo booth for two people. Capture, align, compose, and share a warm film photo strip together.",
  openGraph: {
    title: "Duet",
    description: "Take photos together, even when you are apart.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Duet",
    description: "Take photos together, even when you are apart.",
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
      <body className="flex min-h-full flex-col font-sans selection:bg-[#D4A574]/20">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
