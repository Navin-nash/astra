import { Nav } from "@/components/layout/nav";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { PortfolioGallery } from "@/components/home/portfolio-gallery";
import { WaitlistSection } from "@/components/home/waitlist-section";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <PortfolioGallery />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}
