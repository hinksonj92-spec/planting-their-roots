import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Evergreen Homeschool",
    template: "%s | Evergreen Homeschool",
  },
  description: "The complete homeschool formation system — ages 0 to 18. A structured, open-and-go curriculum covering every domain from birth through graduation.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://evergreen-homeschool.vercel.app"),
  openGraph: {
    title: "Evergreen Homeschool",
    description: "The complete homeschool formation system — ages 0 to 18",
    url: "https://evergreen-homeschool.vercel.app",
    siteName: "Evergreen Homeschool",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Evergreen Homeschool" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evergreen Homeschool",
    description: "The complete homeschool formation system — ages 0 to 18",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Evergreen Homeschool",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#497C59",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`} suppressHydrationWarning>
        <AppProvider>
          <ServiceWorkerRegistration />
          {children}
        </AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
