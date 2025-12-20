import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pockets - Share Expenses Simply",
  description: "Make it extremely easy for willing people to share expenses transparently and settle them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
