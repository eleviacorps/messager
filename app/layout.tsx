import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import PWARegister from "@/components/PWARegister";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "EVText",
  description: "Private realtime messenger for small friend groups.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b0b0b",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={spaceGrotesk.className}>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
