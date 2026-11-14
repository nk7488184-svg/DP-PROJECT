import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safety Dashboard - Campus Road Safety Observatory",
  description: "Admin dashboard for managing campus road safety reports at IIT Mandi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
