import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroKin — Find Your People",
  description:
    "An emotionally intelligent platform that helps students find meaningful peer connections through Digital Twin technology.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
