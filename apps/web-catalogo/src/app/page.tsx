import { BreathingNavbar } from '../components/ui/breathing-navbar';
import { HeroStore } from '../components/landing/hero-store';
import { CollectionScrollerSection } from '../components/landing/collection-scroller-section';
import { ManifestoRevealSection } from '../components/landing/manifesto-reveal-section';
import { LocationTickerSection } from '../components/landing/location-ticker-section';
import { TestimonialsWheelSection } from '../components/landing/testimonials-wheel-section';
import { LiquidGlassFooter } from '../components/ui/liquid-glass-footer';

export default function HomePage() {
  return (
    <main className="relative w-full min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 selection:text-indigo-300">
      <BreathingNavbar />
      <HeroStore />
      <CollectionScrollerSection />
      <ManifestoRevealSection />
      <LocationTickerSection />
      <TestimonialsWheelSection />
      <LiquidGlassFooter />
    </main>
  );
}
