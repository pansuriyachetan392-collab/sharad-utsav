import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source" });

export const metadata: Metadata = {
  title: "Sharad Utsav 2026 · Tickets",
  description: "Book tickets for Sharad Utsav at Radha Krishna Temple, Allen, Texas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans antialiased`}>
        <div className="h-1 bg-primary" />
        {children}
      </body>
    </html>
  );
}
