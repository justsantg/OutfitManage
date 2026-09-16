"use client";

import Link from "next/link";
import { HeroTunnel } from "../ui/hero-tunnel";
import { getWhatsAppUrl, STORE_INFO } from "../../lib/constants";
import { ArrowRight } from "lucide-react";

export function HeroStore() {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-transparent">
      <HeroTunnel isDarkMode={false}>
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
          {/* Titular idéntico al diseño original de Framer */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-[#171B20] leading-[0.95] select-none">
            Nueva<br />Colección
          </h1>

          {/* Subtítulo adaptado a tienda de ropa */}
          <p className="mt-6 text-xs sm:text-sm md:text-base text-[#8B95A0] max-w-md mx-auto font-normal leading-relaxed">
            Prendas de alta costura, patronaje <span className="bg-[#171B20] text-[#FBFAF6] px-1.5 py-0.5 rounded font-semibold text-xs">artesanal</span> y streetwear contemporáneo.
          </p>

          {/* Botones de acción idénticos al template */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/catalogo"
              className="px-6 py-3 rounded-full bg-[#171B20] text-[#FBFAF6] font-semibold text-xs sm:text-sm hover:bg-[#2B3138] transition-all active:scale-95"
            >
              Ver Catálogo
            </Link>

            <a
              href={getWhatsAppUrl(STORE_INFO.whatsappDefaultMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="pl-5 pr-2 py-2 rounded-full bg-[#2B3138] hover:bg-[#171B20] text-[#FBFAF6] font-semibold text-xs sm:text-sm flex items-center gap-2.5 transition-all active:scale-95 shadow-lg shadow-[#171B20]/15"
            >
              <span>Pedir WhatsApp</span>
              <span className="w-7 h-7 rounded-full bg-[#FBFAF6] text-[#171B20] flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>
        </div>
      </HeroTunnel>
    </section>
  );
}
