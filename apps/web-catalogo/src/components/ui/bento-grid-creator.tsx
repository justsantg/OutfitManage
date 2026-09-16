"use client";

import React, { useState, startTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  ShoppingBag,
  Film,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Bell,
  Flame,
} from "lucide-react";
import { formatCurrency } from "../../lib/api";
import { getWhatsAppUrl } from "../../lib/constants";

export interface BentoVariantMedia {
  url: string;
  tipo: "IMAGE" | "VIDEO";
  orden: number;
}

export interface BentoVariantItem {
  id: string;
  skuCode: string;
  talla: string;
  color: string;
  imagenUrl?: string | null;
  imagenes?: BentoVariantMedia[];
  disponible: boolean;
  // Solo estado categórico: el catálogo público nunca expone la cantidad exacta de stock
  // (SRS 6.5). El backend ya no envía un conteo numérico.
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface BentoItem {
  id?: string | number;
  src?: string | null;
  tipo?: "IMAGE" | "VIDEO";
  alt?: string;
  title: string;
  category?: string;
  price?: number;
  tallas?: string[];
  colores?: string[];
  variantes?: BentoVariantItem[];
  stockTotal?: number;
  description?: string;
}

export interface SpanConfigItem {
  imageIndex: number;
  colSpan: number;
  rowSpan: number;
}

export interface BentoGridCreatorProps {
  items: BentoItem[];
  gap?: number;
  borderRadius?: number;
  enableSpanning?: boolean;
  spanConfig?: SpanConfigItem[];
  enableLightbox?: boolean;
  grayscaleOnHover?: boolean;
  className?: string;
}

const SOLID_PALETTES = [
  "bg-gradient-to-br from-[#E9EDEF] to-[#DCE0E3]",
  "bg-gradient-to-br from-[#F4F2EE] to-[#E9EDEF]",
  "bg-gradient-to-br from-[#DCE0E3] to-[#C7D6E1]",
  "bg-gradient-to-br from-[#FBFAF6] to-[#F4F2EE]",
  "bg-gradient-to-br from-[#E9EDEF] to-[#BAC9D6]",
  "bg-gradient-to-br from-[#F4F2EE] to-[#DCE0E3]",
];

const DEFAULT_SPANS: SpanConfigItem[] = [
  { imageIndex: 0, colSpan: 2, rowSpan: 2 },
  { imageIndex: 3, colSpan: 2, rowSpan: 1 },
  { imageIndex: 6, colSpan: 2, rowSpan: 2 },
  { imageIndex: 9, colSpan: 2, rowSpan: 1 },
];

function isVideoUrl(url: string | null | undefined, tipo?: string): boolean {
  if (tipo === "VIDEO") return true;
  if (!url) return false;
  return Boolean(url.match(/\.(mp4|webm|mov)(\?.*)?$/i));
}

export function BentoGridCreator({
  items = [],
  gap = 16,
  borderRadius = 28,
  enableSpanning = true,
  spanConfig = DEFAULT_SPANS,
  enableLightbox = true,
  grayscaleOnHover = false,
  className = "",
}: BentoGridCreatorProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const activeItem = items[activeItemIndex] || null;

  // When active item changes, reset selected color & size to defaults
  useEffect(() => {
    if (!activeItem) return;
    const defaultColor = activeItem.colores && activeItem.colores.length > 0 ? activeItem.colores[0] : null;
    const defaultSize = activeItem.tallas && activeItem.tallas.length > 0 ? activeItem.tallas[0] : null;
    setSelectedColor(defaultColor);
    setSelectedSize(defaultSize);
    setActiveMediaIndex(0);
  }, [activeItemIndex, activeItem]);

  const handleCardClick = (index: number) => {
    if (!enableLightbox) return;
    startTransition(() => {
      setActiveItemIndex(index);
      setLightboxOpen(true);
    });
  };

  const navigateNext = () => {
    setActiveItemIndex((prev) => (prev + 1) % items.length);
  };

  const navigatePrev = () => {
    setActiveItemIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") navigateNext();
      if (e.key === "ArrowLeft") navigatePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, activeItemIndex, items.length]);

  // Current matched variant in Lightbox
  const matchedVariant = activeItem?.variantes?.find(
    (v) =>
      (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase()) &&
      (!selectedSize || v.talla.toLowerCase() === selectedSize.toLowerCase())
  );

  // Collect all media for currently selected color
  const matchedColorVariants =
    activeItem?.variantes?.filter(
      (v) => !selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase()
    ) || [];

  const colorGallery: { url: string; tipo: "IMAGE" | "VIDEO" }[] = [];

  matchedColorVariants.forEach((v) => {
    if (v.imagenes && v.imagenes.length > 0) {
      v.imagenes.forEach((img) => {
        if (img.url && !colorGallery.some((item) => item.url === img.url)) {
          colorGallery.push({ url: img.url, tipo: img.tipo });
        }
      });
    } else if (v.imagenUrl) {
      if (!colorGallery.some((item) => item.url === v.imagenUrl)) {
        colorGallery.push({
          url: v.imagenUrl,
          tipo: isVideoUrl(v.imagenUrl) ? "VIDEO" : "IMAGE",
        });
      }
    }
  });

  // Fallback to activeItem.src if no variant media found
  if (colorGallery.length === 0 && activeItem?.src) {
    colorGallery.push({
      url: activeItem.src,
      tipo: isVideoUrl(activeItem.src, activeItem.tipo) ? "VIDEO" : "IMAGE",
    });
  }

  const currentMedia = colorGallery[activeMediaIndex] || colorGallery[0];
  const activeMediaUrl = currentMedia?.url || activeItem?.src;

  // Stock status calculation
  const isAvailable = matchedVariant ? matchedVariant.disponible : true;
  const isLowStock = matchedVariant?.stockStatus === "LOW_STOCK";

  // Smart suggestions if current combination is out of stock
  const sameSizeOtherColors =
    !isAvailable && selectedSize && activeItem?.variantes
      ? activeItem.variantes.filter(
          (v) =>
            v.talla.toLowerCase() === selectedSize.toLowerCase() &&
            v.color.toLowerCase() !== selectedColor?.toLowerCase() &&
            v.disponible
        )
      : [];

  const sameColorOtherSizes =
    !isAvailable && selectedColor && activeItem?.variantes
      ? activeItem.variantes.filter(
          (v) =>
            v.color.toLowerCase() === selectedColor.toLowerCase() &&
            v.talla.toLowerCase() !== selectedSize?.toLowerCase() &&
            v.disponible
        )
      : [];

  return (
    <div className={`relative w-full ${className}`}>
      {/* Bento Grid Container */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[280px] sm:auto-rows-[320px]"
        style={{ gap: `${gap}px` }}
      >
        {items.map((item, index) => {
          const span = enableSpanning ? spanConfig.find((s) => s.imageIndex === index) : null;
          const colSpanClass =
            span?.colSpan === 2
              ? "lg:col-span-2"
              : span?.colSpan === 3
              ? "lg:col-span-3"
              : "col-span-1";
          const rowSpanClass =
            span?.rowSpan === 2
              ? "lg:row-span-2"
              : span?.rowSpan === 3
              ? "lg:row-span-3"
              : "row-span-1";

          const hasValidMedia = Boolean(item.src && !imageErrors[`grid-${index}`]);
          const isVideo = hasValidMedia && isVideoUrl(item.src, item.tipo);
          const paletteClass = SOLID_PALETTES[index % SOLID_PALETTES.length];

          // Check if entire product is out of stock or low stock
          const allOutOfStock =
            item.variantes &&
            item.variantes.length > 0 &&
            item.variantes.every((v) => !v.disponible);
          const hasLowStock = item.variantes?.some((v) => v.stockStatus === "LOW_STOCK");

          return (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
              onClick={() => handleCardClick(index)}
              className={`group relative overflow-hidden bg-[#F4F2EE]/70 border border-[#C9CDD2]/40 hover:border-[#8B95A0]/60 transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-sm ${colSpanClass} ${rowSpanClass}`}
              style={{ borderRadius: `${borderRadius}px` }}
            >
              {/* Product Background */}
              {hasValidMedia ? (
                isVideo ? (
                  <video
                    src={item.src!}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.src!}
                    alt={item.title}
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [`grid-${index}`]: true }));
                    }}
                    className={`w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 ${
                      grayscaleOnHover ? "group-hover:grayscale" : ""
                    }`}
                  />
                )
              ) : (
                <div
                  className={`w-full h-full ${paletteClass} flex flex-col items-center justify-center p-6 text-[#8B95A0] group-hover:text-[#171B20] transition-colors`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/60 border border-[#C9CDD2]/40 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-[#171B20]/30 transition-all shadow-sm">
                    <ShoppingBag className="w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity text-[#171B20]" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8B95A0] group-hover:text-[#171B20] text-center font-bold px-4 line-clamp-1 transition-colors">
                    {item.category || "Atelier"}
                  </span>
                </div>
              )}

              {/* Ink Dark Soft Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171B20]/85 via-[#171B20]/25 to-transparent opacity-85 group-hover:opacity-95 transition-opacity pointer-events-none" />

              {/* Top Left Badges: Category & Stock & Video */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 flex-wrap">
                {item.category && (
                  <span className="px-2.5 py-1 rounded-full bg-[#FBFAF6]/85 backdrop-blur-md border border-[#C9CDD2]/40 text-[10px] font-mono font-bold uppercase tracking-wider text-[#171B20] shadow-sm">
                    {item.category}
                  </span>
                )}

                {allOutOfStock ? (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/85 backdrop-blur-md text-[10px] font-mono font-bold text-[#FBFAF6] shadow-sm flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>Agotado</span>
                  </span>
                ) : hasLowStock ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-[10px] font-mono font-bold text-zinc-950 shadow-sm flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-current" />
                    <span>Pocas unidades</span>
                  </span>
                ) : null}

                {isVideo && (
                  <span className="px-2 py-1 rounded-full bg-[#171B20]/85 backdrop-blur-md text-[10px] font-mono font-bold text-[#FBFAF6] flex items-center gap-1 border border-[#C9CDD2]/30">
                    <Film className="w-3 h-3" />
                    <span>Video</span>
                  </span>
                )}
              </div>

              {/* Price Tag (Top Right) */}
              {item.price !== undefined && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-[#171B20]/90 backdrop-blur-md text-[#FBFAF6] text-xs font-mono font-bold shadow-lg border border-[#C9CDD2]/30">
                    {formatCurrency(item.price)}
                  </span>
                </div>
              )}

              {/* Bottom Content Info */}
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 z-10 space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-[#FBFAF6] tracking-tight line-clamp-2 group-hover:text-white transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center justify-between pt-1 border-t border-white/20">
                  {item.tallas && item.tallas.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-zinc-300 uppercase">Tallas:</span>
                      <span className="text-[11px] font-mono font-semibold text-white">
                        {item.tallas.join(" · ")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-emerald-400">Stock disponible</span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#FBFAF6]/90 group-hover:text-white transition-colors">
                    <span>Ver Ficha</span>
                    <Sparkles className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox Modal with Multi-Photo Gallery & Smart Suggestions */}
      <AnimatePresence>
        {lightboxOpen && activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-50 bg-[#171B20]/75 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          >
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[92vh] bg-[#F4F2EE] border border-[#C9CDD2]/60 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 text-[#171B20]"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] flex items-center justify-center hover:bg-[#171B20] hover:text-[#FBFAF6] transition-all shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Product Navigation Arrows (Prev / Next Product) */}
              <button
                type="button"
                onClick={navigatePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] flex items-center justify-center hover:bg-[#171B20] hover:text-[#FBFAF6] transition-all shadow-lg"
                title="Prenda anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={navigateNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] flex items-center justify-center hover:bg-[#171B20] hover:text-[#FBFAF6] transition-all shadow-lg md:hidden"
                title="Siguiente prenda"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Left Column: Image / Video Gallery (6 cols) */}
              <div className="md:col-span-6 relative min-h-[340px] md:min-h-[520px] bg-[#E9EDEF]/60 overflow-hidden flex flex-col justify-between">
                {/* Active Photo / Video Display */}
                <div className="relative flex-1 w-full h-full min-h-[280px] flex items-center justify-center overflow-hidden">
                  {activeMediaUrl && !imageErrors[`modal-${activeMediaUrl}`] ? (
                    isVideoUrl(activeMediaUrl, currentMedia?.tipo) ? (
                      <video
                        src={activeMediaUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeMediaUrl}
                        alt={activeItem.title}
                        onError={() => {
                          setImageErrors((prev) => ({
                            ...prev,
                            [`modal-${activeMediaUrl}`]: true,
                          }));
                        }}
                        className="w-full h-full object-cover object-center transition-all duration-500"
                      />
                    )
                  ) : (
                    <div
                      className={`w-full h-full ${
                        SOLID_PALETTES[activeItemIndex % SOLID_PALETTES.length]
                      } flex flex-col items-center justify-center p-8 text-[#8B95A0]`}
                    >
                      <div className="w-20 h-20 rounded-3xl bg-white/70 border border-[#C9CDD2]/50 flex items-center justify-center mb-4 shadow-md">
                        <ShoppingBag className="w-10 h-10 text-[#171B20] opacity-80" />
                      </div>
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#8B95A0]">
                        {activeItem.category || "Prenda Exclusiva"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171B20]/60 via-transparent to-transparent pointer-events-none" />

                  {/* Intra-Gallery Navigation Arrows if multiple photos in this color */}
                  {colorGallery.length > 1 && (
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) =>
                            prev === 0 ? colorGallery.length - 1 : prev - 1
                          );
                        }}
                        className="w-8 h-8 rounded-full bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] flex items-center justify-center pointer-events-auto hover:bg-[#171B20] hover:text-[#FBFAF6] transition-colors shadow-lg"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMediaIndex((prev) => (prev + 1) % colorGallery.length);
                        }}
                        className="w-8 h-8 rounded-full bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] flex items-center justify-center pointer-events-auto hover:bg-[#171B20] hover:text-[#FBFAF6] transition-colors shadow-lg"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Bottom Tags */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 flex-wrap z-10">
                    {activeItem.category && (
                      <span className="px-3 py-1 rounded-full bg-[#FBFAF6]/85 backdrop-blur-md border border-[#C9CDD2]/50 text-xs font-mono font-bold text-[#171B20] shadow-sm">
                        {activeItem.category}
                      </span>
                    )}
                    {selectedColor && (
                      <span className="px-3 py-1 rounded-full bg-[#171B20]/85 backdrop-blur-md border border-[#C9CDD2]/30 text-xs font-mono font-bold text-[#FBFAF6]">
                        Color: {selectedColor}
                        {colorGallery.length > 1 && ` (${activeMediaIndex + 1}/${colorGallery.length})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnails strip for multi-photo gallery */}
                {colorGallery.length > 1 && (
                  <div className="p-3 bg-[#E9EDEF]/90 border-t border-[#C9CDD2]/40 flex items-center gap-2 overflow-x-auto z-10">
                    {colorGallery.map((media, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveMediaIndex(idx)}
                        className={`relative w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border transition-all ${
                          activeMediaIndex === idx
                            ? "border-[#171B20] ring-2 ring-[#171B20]/30 scale-105 opacity-100"
                            : "border-[#C9CDD2]/50 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                        {media.tipo === "VIDEO" && (
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Film className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Details, Availability & Smart Suggestions (6 cols) */}
              <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-5 overflow-y-auto max-h-[520px] md:max-h-none">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-widest text-[#171B20] bg-[#171B20]/5 border border-[#C9CDD2]/40 px-3 py-1 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-[#3A3F45]" />
                      <span>Prenda Exclusiva</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#171B20] tracking-tight">
                    {activeItem.title}
                  </h2>

                  {activeItem.price !== undefined && (
                    <div className="text-2xl font-mono font-extrabold text-[#171B20]">
                      {formatCurrency(activeItem.price)}
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-[#8B95A0] leading-relaxed">
                    {activeItem.description ||
                      "Confeccionada con estándares de alta costura, fibras nobles de alto gramaje y cortes anatómicos modernos para máxima durabilidad y estilo."}
                  </p>

                  {/* 1. Color Selector */}
                  {activeItem.colores && activeItem.colores.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono text-[#8B95A0]">
                        <span className="uppercase tracking-wider">Color:</span>
                        <span className="text-[#171B20] font-bold">{selectedColor}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeItem.colores.map((color) => {
                          const isSelected = selectedColor === color;
                          const hasStockInColor = activeItem.variantes?.some(
                            (v) => v.color.toLowerCase() === color.toLowerCase() && v.disponible
                          );

                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setSelectedColor(color);
                                setActiveMediaIndex(0);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-[#171B20] text-[#FBFAF6] shadow-md scale-105"
                                  : hasStockInColor
                                  ? "bg-white/90 text-[#2B3138] hover:bg-white border border-[#C9CDD2]/60 hover:border-[#8B95A0]"
                                  : "bg-[#171B20]/5 text-[#8B95A0] line-through border border-[#C9CDD2]/30 opacity-60"
                              }`}
                            >
                              <span>{color}</span>
                              {!hasStockInColor && (
                                <span className="text-[9px] font-sans no-underline opacity-80">
                                  (Agotado)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Size Selector with Strikethrough for Out-of-Stock */}
                  {activeItem.tallas && activeItem.tallas.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono text-[#8B95A0]">
                        <span className="uppercase tracking-wider">Talla:</span>
                        <span className="text-[#171B20] font-bold">{selectedSize}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeItem.tallas.map((talla) => {
                          const isSelected = selectedSize === talla;
                          const isAvailableInColor = activeItem.variantes?.some(
                            (v) =>
                              v.talla.toLowerCase() === talla.toLowerCase() &&
                              (!selectedColor ||
                                v.color.toLowerCase() === selectedColor.toLowerCase()) &&
                              v.disponible
                          );

                          return (
                            <button
                              key={talla}
                              type="button"
                              onClick={() => setSelectedSize(talla)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all relative ${
                                isSelected
                                  ? "bg-[#171B20] text-[#FBFAF6] shadow-md scale-105"
                                  : isAvailableInColor
                                  ? "bg-white/90 text-[#2B3138] hover:bg-white border border-[#C9CDD2]/60 hover:border-[#8B95A0]"
                                  : "bg-[#171B20]/5 text-[#8B95A0] line-through border border-[#C9CDD2]/30 opacity-50"
                              }`}
                            >
                              <span>{talla}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Real-Time Stock Feedback Banner */}
                  <div className="pt-2">
                    {isAvailable ? (
                      isLowStock ? (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-mono text-amber-600">
                          <Flame className="w-4 h-4 fill-current shrink-0 text-amber-500" />
                          <span>
                            {`¡Pocas unidades disponibles en Talla ${selectedSize} (${selectedColor})!`}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs font-mono text-emerald-600">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                          <span>Disponible en bodega para despacho inmediato</span>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs font-mono text-rose-500">
                          <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>
                            Agotado en {selectedColor} Talla {selectedSize}
                          </span>
                        </div>

                        {/* 4. Smart Alternative Suggestions (Cross-Selling) */}
                        {(sameSizeOtherColors.length > 0 || sameColorOtherSizes.length > 0) && (
                          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#C9CDD2]/50 space-y-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#171B20] font-bold block flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#3A3F45]" />
                              <span>Alternativas disponibles ahora:</span>
                            </span>

                            <div className="flex flex-wrap gap-2">
                              {sameSizeOtherColors.map((alt) => (
                                <button
                                  key={alt.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedColor(alt.color);
                                    setSelectedSize(alt.talla);
                                    setActiveMediaIndex(0);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#171B20]/5 hover:bg-[#171B20] hover:text-[#FBFAF6] text-[#171B20] border border-[#C9CDD2]/60 flex items-center gap-1.5 transition-colors"
                                >
                                  <span>Talla {alt.talla} en {alt.color}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              ))}

                              {sameColorOtherSizes.map((alt) => (
                                <button
                                  key={alt.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedColor(alt.color);
                                    setSelectedSize(alt.talla);
                                    setActiveMediaIndex(0);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#171B20]/5 hover:bg-[#171B20] hover:text-[#FBFAF6] text-[#171B20] border border-[#C9CDD2]/60 flex items-center gap-1.5 transition-colors"
                                >
                                  <span>{alt.color} en Talla {alt.talla}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* WhatsApp Action Button */}
                <div className="pt-3 border-t border-[#C9CDD2]/40 space-y-2">
                  {isAvailable ? (
                    <a
                      href={getWhatsAppUrl(
                        `Hola! Estoy interesado(a) en la prenda: *${activeItem.title}*${
                          selectedColor ? ` (Color: ${selectedColor})` : ""
                        }${selectedSize ? ` (Talla: ${selectedSize})` : ""}${
                          activeItem.price ? ` por valor de ${formatCurrency(activeItem.price)}` : ""
                        }. ¿Me confirman disponibilidad para despacho?`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#171B20] hover:bg-[#2B3138] text-[#FBFAF6] font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
                    >
                      <MessageCircle className="w-5 h-5 fill-current" />
                      <span>
                        Pedir por WhatsApp ({selectedColor} · {selectedSize})
                      </span>
                    </a>
                  ) : (
                    <a
                      href={getWhatsAppUrl(
                        `Hola! Vi la prenda *${activeItem.title}* en su catálogo pero está agotada en Color ${selectedColor} Talla ${selectedSize}. ¿Cuándo tendrán nueva disponibilidad o reposición?`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#2B3138] hover:bg-[#171B20] text-[#FBFAF6] font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
                    >
                      <Bell className="w-5 h-5" />
                      <span>Notificarme reposición por WhatsApp</span>
                    </a>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8B95A0] px-1">
                    <span>Envíos a todo el país</span>
                    <span>Asesoría personalizada</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BentoGridCreator;
