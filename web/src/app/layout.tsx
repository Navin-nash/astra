import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { FloatingThemeToggle } from "@/components/ui/floating-theme-toggle";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const satoshi = localFont({
  src: "../../fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Astra - Your GitHub, as a portfolio",
  description:
    "Astra transforms your GitHub repos into a beautifully designed technical portfolio. AI-powered, instantly deployed, zero manual work.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
  },
  openGraph: {
    title: "Astra - Your GitHub, as a portfolio",
    description:
      "Astra transforms your GitHub repos into a beautifully designed technical portfolio.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${geistMono.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
      <TooltipProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          >
          {children}
          <FloatingThemeToggle />
          <Toaster position="bottom-left" />
        </ThemeProvider>
          </TooltipProvider>
      </body>
    </html>
  );
}
