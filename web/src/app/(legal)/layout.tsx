import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Nav />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
