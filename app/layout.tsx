import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: "ELP Moi Chapter — Official Voting System",
    template: "%s | ELP Moi Chapter"
  },
  description: "Official secure electronic voting platform for the Equity Leaders Program, Moi University Chapter. Empowering scholars to lead through transparent, real-time democratic processes.",
  keywords: ["ELP", "Moi University", "Voting", "Election", "Equity Leaders Program", "IEC", "Student Leadership", "Kenya"],
  authors: [{ name: "IEC ELP Moi Chapter" }],
  openGraph: {
    title: "ELP Moi Chapter — Official Voting System",
    description: "Cast your vote securely for the next generation of leadership in the Equity Leaders Program, Moi Chapter.",
    url: "https://iec.gtss.software",
    siteName: "ELP Moi Voting",
    images: [
      {
        url: "/banner.webp",
        width: 1200,
        height: 630,
        alt: "ELP Moi Chapter Voting Platform",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ELP Moi Chapter — Official Voting System",
    description: "Lead with integrity. Cast your vote securely on the official ELP Moi Chapter platform.",
    images: ["/banner.webp"],
  },
};

import { ToastProvider } from "@/context/ToastContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
