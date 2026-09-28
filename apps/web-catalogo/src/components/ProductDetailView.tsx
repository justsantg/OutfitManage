'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductoDetallePublico, VariantePublica } from '../types/catalogo';
import { formatCurrency } from '../lib/api';
import { getWhatsAppUrl } from '../lib/constants';
import {
  MessageCircle,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react';

interface ProductDetailViewProps {
  producto: ProductoDetallePublico;
}

export default function ProductDetailView({ producto }: ProductDetailViewProps) {
  // Imagen activa en la galería
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Filtros de variante
  const tallasDisponibles = Array.from(new Set(producto.variantes.map((v) => v.talla)));
  const coloresDisponibles = Array.from(new Set(producto.variantes.map((v) => v.color)));

  const [selectedTalla, setSelectedTalla] = useState<string>(tallasDisponibles[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(coloresDisponibles[0] || '');

  // Buscar la variante específica seleccionada
  const selectedVariante: VariantePublica | undefined = producto.variantes.find(
    (v) => v.talla === selectedTalla && v.color === selectedColor
  ) || producto.variantes[0];

  const estaDisponible = selectedVariante?.disponible ?? false;

  // Generar link de WhatsApp personalizado con la variante elegida
  const tiendaNombre = process.env.NEXT_PUBLIC_TIENDA_NOMBRE || 'OutfitManage';
  const customMessage = `¡Hola ${tiendaNombre}! Me interesa pedir la prenda *${producto.nombre}*${
    selectedVariante
      ? ` en talla *${selectedVariante.talla}*, color *${selectedVariante.color}* (SKU: ${selectedVariante.skuCode})`
      : ''
  }. ¿Tienen disponibilidad para envío inmediato?`;

  const dynamicWhatsAppLink = getWhatsAppUrl(customMessage);

  // Compartir ficha
  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${producto.nombre} | ${tiendaNombre}`,
        text: producto.descripcion || 'Mira esta prenda en el catálogo virtual',
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace del producto copiado al portapapeles!');
    }
  };

  const currentImage = producto.imagenes[selectedImageIndex]?.urlStorage;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Botón Volver y Categoría */}
      <div className="flex items-center justify-between">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo</span>
        </Link>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Compartir</span>
        </button>
      </div>

      {/* Grid Principal: Galería a la izquierda, Detalles a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Galería de Imágenes (6 cols en lg) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Imagen Principal */}
          <div className="relative aspect-[4/5] w-full rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-2xl">
            {currentImage && !imgError ? (
              <img
                src={currentImage}
                alt={producto.nombre}
                className="w-full h-full object-cover object-center transition-all duration-300"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-100 dark:bg-slate-900">
                <Sparkles className="w-16 h-16 mb-4 opacity-50 text-sky-500" />
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-center">
                  {producto.nombre}
                </span>
                <span className="text-xs text-slate-400 mt-1">Prenda en exhibición oficial</span>
              </div>
            )}

            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-black/70 backdrop-blur-md text-sky-700 dark:text-sky-300 border border-slate-200/80 dark:border-white/10 shadow-sm">
                {producto.categoria.nombre}
              </span>
            </div>
          </div>

          {/* Carrusel de Miniaturas */}
          {producto.imagenes.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {producto.imagenes.map((img, idx) => (
                <button
                  key={img.urlStorage}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 aspect-square rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImageIndex === idx
                      ? 'border-sky-500 shadow-md shadow-sky-500/30 scale-105'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.urlStorage} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información y Selector de Compra (6 cols en lg) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Título y Precio */}
            <div>
              <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                {producto.categoria.nombre}
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                {producto.nombre}
              </h1>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
                  {formatCurrency(producto.precioActual)}
                </span>
                <span className="text-xs text-slate-500 font-medium">IVA incluido</span>
              </div>
            </div>

            {/* Descripción */}
            {producto.descripcion && (
              <div className="prose prose-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <p>{producto.descripcion}</p>
              </div>
            )}

            {/* Selector de Tallas */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block font-mono">
                Selecciona tu Talla:
              </label>
              <div className="flex flex-wrap gap-2">
                {tallasDisponibles.map((talla) => {
                  const isSelected = selectedTalla === talla;
                  // Comprobar si hay stock para esta talla en algún color
                  const hayStockTalla = producto.variantes.some((v) => v.talla === talla && v.disponible);

                  return (
                    <button
                      key={talla}
                      onClick={() => setSelectedTalla(talla)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 scale-105 border border-sky-400'
                          : hayStockTalla
                          ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          : 'bg-slate-100 dark:bg-slate-900/50 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 line-through'
                      }`}
                    >
                      {talla}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Colores */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block font-mono">
                Selecciona tu Color:
              </label>
              <div className="flex flex-wrap gap-2">
                {coloresDisponibles.map((color) => {
                  const isSelected = selectedColor === color;
                  // Comprobar si hay stock para este color en la talla elegida
                  const hayStockColor = producto.variantes.some(
                    (v) => v.talla === selectedTalla && v.color === color && v.disponible
                  );

                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md scale-105'
                          : hayStockColor
                          ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                          : 'bg-slate-100 dark:bg-slate-900/50 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estado de Disponibilidad de la Variante Seleccionada */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                {estaDisponible ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {estaDisponible ? 'Disponible para despacho inmediato' : 'Temporalmente agotado'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    SKU: {selectedVariante?.skuCode || 'N/A'} • Talla {selectedTalla} • Color {selectedColor}
                  </span>
                </div>
              </div>

              {estaDisponible && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  En Stock
                </span>
              )}
            </div>

            {/* Botón Principal: Pedir por WhatsApp */}
            <div className="space-y-3 pt-2">
              <a
                href={dynamicWhatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                  estaDisponible
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white glow-whatsapp hover:scale-[1.01]'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>
                  {estaDisponible
                    ? `Pedir ${selectedTalla} / ${selectedColor} por WhatsApp`
                    : 'Agotado en esta combinación'}
                </span>
              </a>
              <p className="text-[11px] text-center text-slate-500">
                Al hacer clic se abrirá un chat directo con nuestro asesor de tienda para coordinar el pago y envío.
              </p>
            </div>
          </div>

          {/* Garantías y Beneficios */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <Truck className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Envíos seguros a nivel nacional</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Garantía de confección y calidad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
