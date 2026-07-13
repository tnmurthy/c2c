import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import UserJourneyGuide from "@/components/UserJourneyGuide";

const hanken = Hanken_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-hanken',
});

const jetbrains = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://c2c.taliatech.in'),
  title: "c2c | Campus to Corporate",
  description: "The ultimate ordeal for future legends.",
  openGraph: {
    title: "c2c | Campus to Corporate",
    description: "Bridge the gap between campus and corporate with neural-matched precision benchmarks.",
    url: "https://c2c.taliatech.in",
    siteName: "c2c Platform",
    images: [
      {
        url: "/qa-screenshots/landing_page.png",
        width: 1200,
        height: 630,
        alt: "c2c Platform Interface Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "c2c | Campus to Corporate",
    description: "Bridge the gap between campus and corporate with neural-matched precision benchmarks.",
    images: ["/qa-screenshots/landing_page.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hanken.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased bg-background text-slate-200">
        {children}
        <UserJourneyGuide />
      </body>
    </html>
  );
}
