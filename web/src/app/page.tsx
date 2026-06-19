import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { Nav } from "@/components/layout/nav";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { PortfolioGallery } from "@/components/home/portfolio-gallery";
import { DemoSection } from "@/components/home/demo-section";
import { WaitlistSection } from "@/components/home/waitlist-section";
import { SignupCtaSection } from "@/components/home/signup-cta-section";
import { ContactSection } from "@/components/home/contact-section";
import { Footer } from "@/components/layout/footer";
import { BETA_MODE } from "@/lib/features";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  // Inherits full OG + Twitter cards from root layout; override only what differs
  openGraph: {
    url: siteConfig.url,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    images: [
      {
        url: siteConfig.ogImage,
        secureUrl: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — Turn your GitHub into a stunning developer portfolio in under 60 seconds`,
        type: "image/png",
      },
    ],
  },
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <PortfolioGallery />
        <DemoSection />
        {BETA_MODE ? <WaitlistSection /> : <SignupCtaSection />}
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
