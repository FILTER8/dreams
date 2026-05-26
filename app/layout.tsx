import type { Metadata } from "next";
import { Major_Mono_Display } from "next/font/google";
import "./globals.css";

const majorMono = Major_Mono_Display({
  variable: "--font-major-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Chain Dreams",
  description: "1982 on-chain language model artifacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${majorMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}