"use client";

import React, { useState } from "react";
import { InfiniteTextWheel } from "../ui/infinite-text-wheel";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, MessageSquareQuote, Sparkles } from "lucide-react";

const TESTIMONIALS = [
  {
    author: "Camila Restrepo",
    city: "Medellín, CO",
    role: "Cliente Verificado",
    item: "Hoodie Streetwear Noir (320 GSM)",
    rating: 5,
    quote:
      "La calidad del algodón pima es impresionante, no se deforma tras los lavados y el corte oversize es perfecto. Sin duda mi tienda de referencia en Colombia.",
  },
  {
    author: "Mateo Giraldo",
    city: "Bogotá, CO",
    role: "Cliente Verificado",
    item: "Chaqueta Denim Índigo 14oz",
    rating: 5,
    quote:
      "El denim tiene una estructura y caída de otro nivel. Compré por WhatsApp y la asesoría de tallas fue precisa al 100%. Llegó al día siguiente.",
  },
  {
    author: "Valentina Muñoz",
    city: "Cali, CO",
    role: "Estilista de Moda",
    item: "Blazer Sastrería Contemporánea",
    rating: 5,
    quote:
      "Patronaje y costuras a la altura de marcas de lujo internacionales. Se nota la dedicación artesanal y el cuidado en cada terminación.",
  },
  {
    author: "Sebastián Vargas",
    city: "Barranquilla, CO",
    role: "Cliente Frecuente",
    item: "Camiseta Boxy Fit Peinada",
    rating: 5,
    quote:
      "La tela es fresca, pesada y de textura súper suave. Ya tengo 4 colores en mi armario. La atención es impecable.",
  },
  {
    author: "Sofía Cárdenas",
    city: "Bucaramanga, CO",
    role: "Creadora de Contenido",
    item: "Cápsula Botánica Midi",
    rating: 5,
    quote:
      "Me fascina la propuesta de tintes botánicos y confección ética. Es una prenda que genera cumplidos cada vez que la uso en eventos.",
  },
  {
    author: "David Lopera",
    city: "Pereira, CO",
    role: "Cliente Verificado",
    item: "Pantalón Cargo Táctico",
    rating: 5,
    quote:
      "Bolsillos funcionales, textil resistente y calce anatómico. Pedir por WhatsApp fue súper ágil y el empaque venía 10/10.",
  },
];

export function TestimonialsWheelSection() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentTestimonial = TESTIMONIALS[selectedIndex] || TESTIMONIALS[0];

  const authorNames = TESTIMONIALS.map((t) => t.author);

  return (
    <section
      id="testimonios"
      className="relative w-full bg-transparent text-[#171B20] py-24 sm:py-32 px-6 sm:px-8 border-t border-[#C9CDD2]/30 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#171B20]/5 border border-[#C9CDD2]/40 text-[#171B20] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#8B95A0]" />
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#8B95A0]">
              Experiencias de Clientes
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#171B20]">
            Opiniones de Nuestra Comunidad
          </h2>
          <p className="text-sm text-[#8B95A0] max-w-md mx-auto">
            Gira la rueda o arrastra para explorar lo que opinan quienes visten nuestras prendas.
          </p>
        </div>

        {/* 2-Column Grid: Infinite Wheel on the left, Detailed Card on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
          {/* Wheel Selector (5 cols) */}
          <div className="lg:col-span-5 relative rounded-3xl bg-[#F4F2EE]/60 border border-[#C9CDD2]/40 p-2 sm:p-4 backdrop-blur-xl shadow-2xl">
            <div className="px-4 pt-2 text-[10px] font-mono uppercase tracking-widest text-[#8B95A0] flex items-center justify-between">
              <span>Selecciona un cliente</span>
              <span>↕ Arrastra</span>
            </div>
            <InfiniteTextWheel
              items={authorNames}
              onSelectIndex={setSelectedIndex}
              arrowColor="#2B3138"
              color="#8B95A0"
            />
          </div>

          {/* Testimonial Active Card (7 cols) */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial.author}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="p-8 sm:p-10 rounded-3xl bg-[#FBFAF6]/70 border border-[#C9CDD2]/40 backdrop-blur-2xl shadow-2xl space-y-6 relative overflow-hidden"
              >
                {/* Background quote icon watermark */}
                <MessageSquareQuote className="absolute -bottom-6 -right-6 w-36 h-36 text-[#171B20]/[0.04] pointer-events-none" />

                {/* Rating & Garment */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: currentTestimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>

                  <span className="text-[11px] font-mono font-medium px-3 py-1 rounded-full bg-[#171B20]/8 border border-[#C9CDD2]/30 text-[#8B95A0]">
                    {currentTestimonial.item}
                  </span>
                </div>

                {/* Main Quote */}
                <p className="text-lg sm:text-2xl text-[#2B3138] font-medium leading-relaxed italic">
                  "{currentTestimonial.quote}"
                </p>

                {/* Author Info */}
                <div className="flex items-center justify-between pt-4 border-t border-[#C9CDD2]/30">
                  <div>
                    <h4 className="text-base font-bold text-[#171B20] flex items-center gap-2">
                      <span>{currentTestimonial.author}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    </h4>
                    <p className="text-xs text-[#8B95A0] mt-0.5">
                      {currentTestimonial.city}
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                    {currentTestimonial.role}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsWheelSection;
