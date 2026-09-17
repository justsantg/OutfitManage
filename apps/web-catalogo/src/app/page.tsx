import { BreathingNavbar } from '../components/ui/breathing-navbar';
import { HeroStore } from '../components/landing/hero-store';
import { CollectionScrollerSection } from '../components/landing/collection-scroller-section';
import { ManifestoRevealSection } from '../components/landing/manifesto-reveal-section';
import { LocationTickerSection } from '../components/landing/location-ticker-section';
import { TestimonialsWheelSection } from '../components/landing/testimonials-wheel-section';
import { LiquidGlassFooter } from '../components/ui/liquid-glass-footer';

const HOME_LINKS = [
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Lookbook', href: '#scroller-editorial' },
  { label: 'Manifiesto', href: '#manifiesto' },
  { label: 'Sede', href: '#ubicacion' },
  { label: 'Testimonios', href: '#testimonios' },
];

// Página raíz de la tienda virtual: secciones editoriales + acceso al catálogo. Es un Server
// Component; cada sección es un Client Component independiente.
export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-[#050505] text-white">
      <BreathingNavbar links={HOME_LINKS} />
      <main>
        <HeroStore />
        <CollectionScrollerSection />
        <ManifestoRevealSection />
        <LocationTickerSection />
        <TestimonialsWheelSection />
      </main>
      <LiquidGlassFooter />
    </div>
  );
}
