"use client";

import React from "react";
import { ImageScroller, ImageScrollerItem } from "../ui/image-scroller";

const LOOKBOOK_ITEMS: ImageScrollerItem[] = [
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1920&fit=crop",
    tag: "Look 01 • Atelier Urbano",
    text: "Streetwear Noir",
    subtitle: "Siluetas oversize en algodón pima de 320 GSM con acabados de alta costura.",
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&fit=crop",
    tag: "Look 02 • Sastrería Contemporánea",
    text: "Corte Asimétrico",
    subtitle: "Blazers desestructurados de lana fría diseñados para confort y elegancia diaria.",
  },
  {
    image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?q=80&w=1920&fit=crop",
    tag: "Look 03 • Edición Limitada",
    text: "Cápsula Botánica",
    subtitle: "Prendas con tintes naturales e hilos orgánicos de edición estrictamente limitada.",
  },
  {
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1920&fit=crop",
    tag: "Look 04 • Denim Collection",
    text: "Índigo Raw 14oz",
    subtitle: "Mezclilla pesada con costuras de alta resistencia y patronaje anatómico.",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1920&fit=crop",
    tag: "Look 05 • Minimalismo",
    text: "Esenciales Puros",
    subtitle: "Básicos elevados que combinan armonía tonal y versatilidad para cualquier temporada.",
  },
];

export function CollectionScrollerSection() {
  return (
    <section id="scroller-editorial" className="relative w-full bg-transparent text-[#171B20]">
      <ImageScroller
        items={LOOKBOOK_ITEMS}
        transitionType="fade"
        backgroundColor="#BAC9D6"
        dockPosition="bottom"
      />
    </section>
  );
}
