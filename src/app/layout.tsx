import type { Metadata } from "next";
import { DM_Mono, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["200", "400"],
});

export const metadata: Metadata = {
  title: "JudgeKit - Hackathon & Science Fair Judging",
  description:
    "Lightweight judging assignment, scoring, and progress tracker for hackathons and science fairs. Shareable links, no accounts needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmMono.variable} ${fraunces.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
