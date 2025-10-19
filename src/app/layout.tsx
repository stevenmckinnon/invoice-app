import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const robotoSans = Roboto({
  variable: "--font-roboto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const getMetadataBase = () => {
  // Use NEXT_PUBLIC_APP_URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // On Vercel, use VERCEL_URL (automatically available)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback for local development
  return "http://localhost:3000";
};

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  title: {
    default: "WWE Invoice App - Professional Invoice Management",
    template: "%s | WWE Invoice App",
  },
  description:
    "Create and manage professional invoices for WWE freelancers and production staff. Track overtime, expenses, and revenue with ease.",
  applicationName: "WWE Invoice App",
  keywords: [
    "invoice",
    "WWE",
    "freelancer",
    "production",
    "billing",
    "invoicing",
  ],
  authors: [{ name: "Steve McKinnon", url: "https://stevenmckinnon.co.uk" }],
  creator: "Steve McKinnon",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WWE Invoice",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "WWE Invoice App",
    title: "WWE Invoice App - Professional Invoice Management",
    description:
      "Create and manage professional invoices for WWE freelancers and production staff",
    url: "/",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "WWE Invoice App",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WWE Invoice App",
    description: "Professional invoice management for freelancers",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${robotoSans.variable} ${robotoMono.variable} antialiased`}
      >
        <Providers>
          <AppHeader />
          <main className="mx-auto h-[calc(100dvh-64px)]">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
