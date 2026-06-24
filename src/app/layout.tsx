import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TAGLINE = "Eco-Friendly Accommodation Built with Sustainable Comfort in Mind";

export const metadata: Metadata = {
  title: {
    default: `BokoBoko — ${TAGLINE}`,
    template: "%s · BokoBoko",
  },
  description: TAGLINE,
  icons: {
    icon: '/images/Boko-Logo.png',
  },
  openGraph: {
    title: `BokoBoko — ${TAGLINE}`,
    description: TAGLINE,
    type: "website",
    images: ['/images/Boko-Logo.png'],
  },
  twitter: {
    card: "summary_large_image",
    title: `BokoBoko — ${TAGLINE}`,
    description: TAGLINE,
    images: ['/images/Boko-Logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
