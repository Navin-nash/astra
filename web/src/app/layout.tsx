import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { FloatingThemeToggle } from "@/components/ui/floating-theme-toggle";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/lib/site";

import "./globals.css";

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
  metadataBase: new URL(siteConfig.url),

  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },

  description: siteConfig.description,
  keywords: [...siteConfig.keywords],

  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.name,

  // ── Indexing ──────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Canonical ─────────────────────────────────────────────────────────
  alternates: {
    canonical: siteConfig.url,
  },

  // ── Icons ─────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/favicon.svg",
  },

  // ── OpenGraph ─────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
        type: "image/png",
      },
    ],
  },

  // ── Twitter / X ───────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    images: [siteConfig.ogImage],
    creator: "@useastra",
  },

  // ── App metadata ──────────────────────────────────────────────────────
  applicationName: siteConfig.name,
  category: "technology",
};

// ── JSON-LD structured data (AEO + rich results) ──────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: siteConfig.logo,
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: siteConfig.email,
        contactType: "customer support",
      },
      founder: {
        "@type": "Person",
        name: siteConfig.author.name,
        url: siteConfig.author.url,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: { "@id": `${siteConfig.url}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteConfig.url}/{search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteConfig.url}/#app`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "Automatic GitHub repository analysis",
        "AI-generated portfolio narratives",
        "Live portfolio URL in under 60 seconds",
        "Zero configuration required",
        "Supports 20+ programming languages",
        "Auto-updates when you push new code",
        "Custom domain support",
      ],
      screenshot: siteConfig.ogImage,
      creator: { "@id": `${siteConfig.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Astra generate a portfolio from GitHub?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Astra uses a read-only GitHub token to access the repositories you select. It performs AST parsing to extract code structure, architecture patterns, and dependencies, then uses AI to generate a technical narrative. The entire process takes under 60 seconds.",
          },
        },
        {
          "@type": "Question",
          name: "Does Astra store my source code?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Astra only reads code structure — symbols, exports, and dependency graphs — but never stores raw source code. Only the processed summary is cached for performance.",
          },
        },
        {
          "@type": "Question",
          name: "How long does it take to create a portfolio with Astra?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Median time is under 60 seconds for a five-repo portfolio. Repository analysis runs in parallel and publishing is instant.",
          },
        },
        {
          "@type": "Question",
          name: "Which programming languages does Astra support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Astra supports 20+ languages including TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, Swift, and Kotlin, along with major frameworks like Next.js, FastAPI, Django, Gin, Axum, Rails, and Spring Boot.",
          },
        },
        {
          "@type": "Question",
          name: "Does the portfolio update automatically when I push new code?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Astra watches your connected repositories via GitHub webhooks and updates your portfolio within two minutes of every push — no action required from you.",
          },
        },
      ],
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <Analytics />
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
