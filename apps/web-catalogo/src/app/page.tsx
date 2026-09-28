import { BreathingNavbar } from '../components/ui/breathing-navbar';
import { HeroStore } from '../components/landing/hero-store';
import { VitrinaBentoSection } from '../components/landing/vitrina-bento-section';
import { CollectionScrollerSection } from '../components/landing/collection-scroller-section';
import { ManifestoRevealSection } from '../components/landing/manifesto-reveal-section';
import { LocationTickerSection } from '../components/landing/location-ticker-section';
import { TestimonialsWheelSection } from '../components/landing/testimonials-wheel-section';
import { LiquidGlassFooter } from '../components/ui/liquid-glass-footer';
import { CherryBlossomBackground } from '../components/ui/cherry-blossom-background';

export default function HomePage() {
  return (
    <main className="grain-overlay relative w-full min-h-screen bg-gradient-to-b from-[#C7D6E1] via-[#BAC9D6] to-[#DCE0E3] text-[#171B20] selection:bg-[#8B95A0]/30 selection:text-[#2B3138] overflow-x-hidden">
      {/* Sumi-e Cherry Blossom Tree & Drifting Petals Atmospheric Background */}
      <CherryBlossomBackground opacity={0.28} petalCount={32} />

      <BreathingNavbar />
      <HeroStore />
      <VitrinaBentoSection />
      <CollectionScrollerSection />
      <ManifestoRevealSection />
      <LocationTickerSection />
      <TestimonialsWheelSection />
      <LiquidGlassFooter />
    </main>
  );
}
