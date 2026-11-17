import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MetroSathi · Your metro companion",
  description:
    "Independent Tamil and English Chennai Metro smart-card help prototype. Synthetic demo data; not an official CMRL service.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
