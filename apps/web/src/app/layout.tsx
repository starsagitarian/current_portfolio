import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baiju Joseph · Software & Cloud Engineer",
  description: "Portfolio of Baiju Joseph, software and cloud engineer in London.",
};

export const viewport: Viewport = {
  themeColor: "#8ecdf0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The sky script sets --sky on <html> before React loads, so its style is expected to differ.
    <html lang="en-GB" className={`${lexend.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
