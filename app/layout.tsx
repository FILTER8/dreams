import type { Metadata, Viewport } from "next";
import { Major_Mono_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const majorMono = Major_Mono_Display({
  variable: "--font-major-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Chain Dreams",
  description: "1982 on-chain language model artifacts.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Chain Dreams",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${majorMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}