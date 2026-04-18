import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// TODO: add Fraunces serif font for headings once Google Fonts supports it in next/font
// for now using Geist for everything

export const metadata: Metadata = {
  title: "duet — take photos together, apart",
  description:
    "collaborative photo booth for friends who are far apart. on-device portrait segmentation, shared backgrounds, unified color grading.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
