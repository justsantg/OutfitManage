"use client";

import React from "react";
import { InteractiveTickerLink } from "../ui/interactive-ticker-link";
import { MapPin, Navigation, Clock, Sparkles } from "lucide-react";

export function LocationTickerSection() {
  const googleMapsUrl = "https://maps.google.com/?q=Cra+13+%2385-24+Bogota+Colombia";

  return (
    <section id="ubicacion" className="relative w-full bg-transparent text-[#171B20] pt-20 pb-16 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-12 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#171B20]/5 border border-[#C9CDD2]/40 text-[#171B20] shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#8B95A0]">
            Sede Física &amp; Showroom
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#171B20]">
          Visítanos en Nuestro Atelier
        </h2>
        <p className="text-sm text-[#8B95A0] max-w-lg mx-auto">
          Prueba las prendas en persona, siente la textura del algodón pima y recibe asesoría de imagen personalizada.
        </p>
      </div>

      {/* Infinite Ticker with Google Maps redirect */}
      <InteractiveTickerLink mapsUrl={googleMapsUrl} />

      {/* Store Location Cards & Google Maps CTA */}
      <div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Address card */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-6 rounded-2xl bg-[#F4F2EE]/60 border border-[#C9CDD2]/40 hover:border-[#8B95A0]/50 transition-all flex items-start gap-4 group"
        >
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono font-semibold text-[#8B95A0] uppercase">
              Dirección Principal
            </span>
            <h4 className="text-base font-bold text-[#171B20] mt-0.5 group-hover:text-[#3A3F45] transition-colors">
              Cra. 13 #85-24, Zona Rosa
            </h4>
            <p className="text-xs text-[#8B95A0] mt-1">Bogotá, Colombia • Clic para abrir GPS</p>
          </div>
        </a>

        {/* Schedule card */}
        <div className="p-6 rounded-2xl bg-[#F4F2EE]/60 border border-[#C9CDD2]/40 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono font-semibold text-[#8B95A0] uppercase">
              Horario de Atención
            </span>
            <h4 className="text-base font-bold text-[#171B20] mt-0.5">
              Lunes a Sábado: 10am – 8pm
            </h4>
            <p className="text-xs text-[#8B95A0] mt-1">Domingos y festivos: 11am – 6pm</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LocationTickerSection;
