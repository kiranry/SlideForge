import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { display, mono, sans } from "@/lib/app-fonts";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "SlideForge — AI-Powered Presentation Builder",
  description:
    "Generate polished PowerPoint decks from a description, a data file, or both. Charts, speaker notes, and themes — exported as editable .pptx.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          sans.variable,
          display.variable,
          mono.variable
        )}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
