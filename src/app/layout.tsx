import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond" });

export const metadata: Metadata = {
    title: "FounderOS - Command Center",
    description: "Next-gen startup management platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased bg-[var(--ivory)] text-[var(--ink)]`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
