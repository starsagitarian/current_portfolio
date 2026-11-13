import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { TabMotionPause } from "@/motion/TabMotionPause";
import { SkyFollower } from "@/sky/SkyFollower";
import { SKY_INIT_SCRIPT } from "@/sky/sky";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Baiju Joseph · Software & Cloud Engineer", template: "%s · Baiju Joseph" },
  description: "Portfolio of Baiju Joseph, software and cloud engineer in London.",
};

// The browser's own bars take the colour of the sky at the top of each painting.
export const viewport: Viewport = {
  themeColor: [
    { media: "(max-width: 767.98px)", color: "#58aefb" },
    { media: "(min-width: 768px) and (max-width: 1279.98px)", color: "#9283b1" },
    { media: "(min-width: 1280px)", color: "#073d9c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The sky script sets --sky on <html> before React loads, so its style is expected to differ.
    <html lang="en-GB" className={`${lexend.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Sets the light from the width before first paint, so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: SKY_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SkyFollower />
        <TabMotionPause />
        {children}
      </body>
    </html>
  );
}
