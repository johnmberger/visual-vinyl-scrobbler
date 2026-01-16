import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visual Vinyl Scrobbler",
  description: "Scrobble your vinyl records to Last.fm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
