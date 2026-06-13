import localFont from "next/font/local";

/** Self-hosted copies of the former Google Fonts (latin subset, woff2). */
export const sans = localFont({
  src: "../assets/fonts/hanken-grotesk-latin.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "400 700",
});

export const display = localFont({
  src: "../assets/fonts/fraunces-latin.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "400 900",
});

export const mono = localFont({
  src: "../assets/fonts/jetbrains-mono-latin.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "400 700",
});
