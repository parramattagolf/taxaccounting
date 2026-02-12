import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "세무회계 자동화",
  description: "AI 기반 세무회계 자동화 시스템",
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`}>
        {children}
        <Toaster position="top-center" richColors closeButton duration={3000} />
      </body>
    </html>
  );
}
