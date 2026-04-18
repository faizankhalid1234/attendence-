import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers";
import AppNavbar from "@/app/components/layout/AppNavbar";
import SiteFooter from "@/app/components/layout/SiteFooter";
import ServiceWorkerRegistration from "@/app/components/ServiceWorkerRegistration";
import { siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Super admin, company admin, and member roles — shift windows, live GPS, and camera check-in/out. Team dashboards and attendance history in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Attendance Mark",
    template: "%s | Attendance Mark",
  },
  description,
  applicationName: "Attendance Mark",
  referrer: "origin-when-cross-origin",
  keywords: [
    "attendance",
    "check-in",
    "check-out",
    "GPS attendance",
    "shift tracking",
    "team attendance",
    "company admin",
    "member portal",
  ],
  authors: [{ name: "Attendance Mark" }],
  creator: "Attendance Mark",
  publisher: "Attendance Mark",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Attendance Mark",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Attendance Mark",
    title: "Attendance Mark",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Attendance Mark",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <ThemeProvider>
          <AppNavbar />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
