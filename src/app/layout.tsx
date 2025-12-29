import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R2 Downloader - Download & Store Files to Cloudflare R2",
  description: "Download any file from a URL and store it permanently on Cloudflare R2. Get fast, reliable download links instantly.",
  keywords: ["file download", "cloudflare r2", "storage", "file hosting", "url downloader"],
  authors: [{ name: "R2 Downloader" }],
  openGraph: {
    title: "R2 Downloader",
    description: "Download & store files to Cloudflare R2 instantly",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
