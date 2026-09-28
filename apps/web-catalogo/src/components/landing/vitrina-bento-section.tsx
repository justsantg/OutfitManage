"use client";

import React from "react";
import Link from "next/link";
import { InteractiveBentoGallery, MediaItemType } from "../ui/interactive-bento-gallery";
import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react";

const VITRINA_ITEMS: MediaItemType[] = [
  {
    id: 1,
    type: "image",
    title: "Chaqueta Bomber Oversize",
    desc: "Algodón pima encerado de 380 GSM con forro satinado térmico y acabados metálicos mate.",
    url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-2 row-span-2",
    price: 185000,
    link: "/catalogo",
  },
  {
    id: 2,
    type: "image",
    title: "Pantalón Cargo Táctico",
    desc: "Tejido ripstop de alta resistencia con 6 bolsillos utilitarios y ajuste anatómico.",
    url: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-1 row-span-1",
    price: 135000,
    link: "/catalogo",
  },
  {
    id: 3,
    type: "image",
    title: "Hoodie Heavyweight Noir",
    desc: "Felpa perchada de 420 GSM con corte drop-shoulder, capucha doble capa y tacto ultra suave.",
    url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-1 row-span-2",
    price: 155000,
    link: "/catalogo",
  },
  {
    id: 4,
    type: "image",
    title: "Blazer Desestructurado",
    desc: "Sastrería contemporánea en lana fría ligera, solapa estilizada y silueta fluida.",
    url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-1 row-span-1",
    price: 220000,
    link: "/catalogo",
  },
  {
    id: 5,
    type: "image",
    title: "Camiseta Boxy Atelier",
    desc: "Punto de algodón peinado 260 GSM con serigrafía minimalista de tacto imperceptible.",
    url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-1 row-span-1",
    price: 75000,
    link: "/catalogo",
  },
  {
    id: 6,
    type: "image",
    title: "Camisa Cubana Lino Puro",
    desc: "Lino europeo prelavado con textura transpirable, corte relajado y botones de corozo.",
    url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-2 row-span-1",
    price: 125000,
    link: "/catalogo",
  },
  {
    id: 7,
    type: "image",
    title: "Denim Recto Raw 14oz",
    desc: "Mezclilla índigo con remaches de latón y costura en contraste de alta resistencia.",
    url: "https://images.unsplash.com/photo-1542272604-780c96856592?q=80&w=800&fit=crop",
    span: "col-span-1 sm:col-span-1 row-span-1",
    price: 160000,
    link: "/catalogo",
  },
];

export function VitrinaBentoSection() {
  return (
    <section
      id="catalogo-bento"
      className="relative w-full bg-transparent text-[#171B20] py-16 sm:py-24 border-t border-[#C9CDD2]/30 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#E9EDEF]/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#171B20]/5 border border-[#C9CDD2]/40 text-[#171B20] shadow-sm mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#8B95A0]" />
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#8B95A0]">
              Piezas Destacadas &amp; Novedades
            </span>
          </div>
        </div>

        <InteractiveBentoGallery
          title="Vitrina de Colección"
          description="Explora piezas clave de nuestra última entrega. Haz clic sobre cualquier prenda para ver detalles de confección, corte y disponibilidad."
          mediaItems={VITRINA_ITEMS}
        />

        {/* CTA Banner to complete catalog */}
        <div className="mt-12 max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#F4F2EE]/60 via-[#E9EDEF]/40 to-[#F4F2EE]/60 border border-[#C9CDD2]/40 text-center flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 text-[#8B95A0] text-xs font-mono font-bold uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4" />
              <span>Colección Completa</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#171B20]">
              ¿Buscas una talla, color o prenda específica?
            </h3>
            <p className="text-xs sm:text-sm text-[#8B95A0]">
              Accede a nuestro catálogo completo con filtros interactivos por precio, talla y stock en tiempo real.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#171B20] text-[#FBFAF6] font-bold text-xs sm:text-sm hover:bg-[#2B3138] transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg active:scale-95"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default VitrinaBentoSection;
