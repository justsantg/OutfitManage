"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchCatalogo, fetchCategorias } from "../../lib/api";
import { CategoriaPublica, ProductoPublicoItem } from "../../types/catalogo";
import { BreathingNavbar } from "../../components/ui/breathing-navbar";
import { BentoGridCreator, BentoItem, SpanConfigItem } from "../../components/ui/bento-grid-creator";
import { FilterSidebar, FilterState } from "../../components/catalogo/filter-sidebar";
import { LiquidGlassFooter } from "../../components/ui/liquid-glass-footer";
import { CherryBlossomBackground } from "../../components/ui/cherry-blossom-background";
import { Sparkles, Search, Loader2, RefreshCw, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

const INITIAL_FILTERS: FilterState = {
  categoryId: null,
  tallas: [],
  colores: [],
  minPrice: null,
  maxPrice: null,
};

export default function CatalogoPage() {
  const [productos, setProductos] = useState<ProductoPublicoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPublica[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Load categories on mount
  useEffect(() => {
    let isCancelled = false;
    fetchCategorias()
      .then((cats) => {
        if (!isCancelled && Array.isArray(cats)) {
          setCategorias(cats);
        }
      })
      .catch((err) => {
        console.error("Error cargando categorías:", err);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Fetch products from backend
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await fetchCatalogo({
          categoria: filters.categoryId || undefined,
          q: search || undefined,
          limit: 48,
        });

        if (!isCancelled) {
          setProductos(data?.items || []);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Error fetching catálogo:", err);
          setError(err?.message || "No se pudo consultar el catálogo.");
          setProductos([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [filters.categoryId, search]);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSearch("");
  };

  // Client-side refined multi-criteria filtering (Price, Tallas, Colores)
  const filteredProducts = useMemo(() => {
    return productos.filter((p) => {
      // Filter by Talla (multi-select)
      if (filters.tallas.length > 0) {
        const hasTalla = p.variantes?.some((v) =>
          filters.tallas.some((t) => {
            const vTalla = (v.talla || "").toLowerCase().trim();
            const filterT = t.toLowerCase().trim();
            return vTalla === filterT || vTalla.includes(filterT) || filterT.includes(vTalla);
          })
        );
        if (!hasTalla) return false;
      }

      // Filter by Color (multi-select)
      if (filters.colores.length > 0) {
        const hasColor = p.variantes?.some((v) =>
          filters.colores.some((c) =>
            (v.color || "").toLowerCase().includes(c.toLowerCase())
          )
        );
        if (!hasColor) return false;
      }

      // Filter by Price range
      if (filters.minPrice !== null && p.precioActual !== null) {
        if (Number(p.precioActual) < filters.minPrice) return false;
      }
      if (filters.maxPrice !== null && p.precioActual !== null) {
        if (Number(p.precioActual) > filters.maxPrice) return false;
      }

      return true;
    });
  }, [productos, filters]);

  // Extract all available tallas and colors dynamically
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      p.variantes?.forEach((v) => {
        if (v.talla) set.add(v.talla);
      });
    });
    const standardSizes = ["XXS / 26", "XS / 28", "S / 30", "S", "M / 32", "M", "L / 34", "L", "XL / 36", "XL", "XXL / 38"];
    standardSizes.forEach((s) => set.add(s));
    return Array.from(set);
  }, [productos]);

  // Convert filtered products to BentoItems
  const bentoItems: BentoItem[] = filteredProducts.map((p) => {
    const resolvedImg = resolveImageUrl(p.imagenPrincipal);

    const tallas = Array.from(
      new Set(p.variantes?.map((v) => v.talla).filter(Boolean) as string[])
    );

    const colores = Array.from(
      new Set(p.variantes?.map((v) => v.color).filter(Boolean) as string[])
    );

    const variantes = (p.variantes || []).map((v) => ({
      id: v.id,
      skuCode: v.skuCode,
      talla: v.talla,
      color: v.color,
      imagenUrl: resolveImageUrl(v.imagenUrl),
      imagenes: (v.imagenes || []).map((img) => ({
        url: resolveImageUrl(img.url) || img.url,
        tipo: img.tipo,
        orden: img.orden,
      })),
      disponible: v.disponible,
      stockStatus: v.stockStatus,
    }));

    return {
      id: p.productoId,
      src: resolvedImg,
      alt: p.nombre,
      title: p.nombre,
      category: p.categoria?.nombre || "Atelier",
      price: p.precioActual ? Number(p.precioActual) : undefined,
      description: p.descripcion || undefined,
      tallas: tallas.length > 0 ? tallas : ["Estándar"],
      colores: colores.length > 0 ? colores : undefined,
      variantes,
    };
  });

  // Calculate dynamic spans for aesthetic Bento distribution
  const dynamicSpans: SpanConfigItem[] = [
    { imageIndex: 0, colSpan: 2, rowSpan: 2 },
    { imageIndex: 3, colSpan: 2, rowSpan: 1 },
    { imageIndex: 6, colSpan: 2, rowSpan: 2 },
    { imageIndex: 9, colSpan: 2, rowSpan: 1 },
  ];

  const totalActiveFilterCount =
    (filters.categoryId ? 1 : 0) +
    filters.tallas.length +
    filters.colores.length +
    (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0);

  return (
    <div className="grain-overlay relative min-h-screen bg-gradient-to-b from-[#C7D6E1] via-[#BAC9D6] to-[#DCE0E3] text-[#171B20] selection:bg-[#8B95A0]/30 selection:text-[#2B3138] flex flex-col justify-between overflow-x-hidden">
      {/* Sumi-e Cherry Blossom Tree & Drifting Petals Atmospheric Background */}
      <CherryBlossomBackground opacity={0.22} petalCount={28} />

      {/* Floating Navbar */}
      <BreathingNavbar />

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-10">
        {/* Header Title Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#171B20]/5 border border-[#C9CDD2]/40 text-[#171B20] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#3A3F45]" />
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#8B95A0]">
              Catálogo Oficial &amp; Filtros Avanzados
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#171B20]">
            Colección &amp; Prendas Exclusivas
          </h1>

          <p className="text-sm sm:text-base text-[#8B95A0] leading-relaxed">
            Filtra por precio, talla, color y categoría para encontrar la prenda ideal con disponibilidad en vivo.
          </p>
        </div>

        {/* 2-Column Layout: Sidebar Filter on the Left, Bento Gallery on the Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filter Sidebar (4 cols) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24">
            <FilterSidebar
              categorias={categorias}
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleResetFilters}
              availableSizes={availableSizes}
            />
          </div>

          {/* Right Main Content (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Search Bar + Mobile Filter Toggle Button */}
            <div className="p-4 rounded-3xl bg-[#F4F2EE]/75 border border-[#C9CDD2]/40 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A0]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre de prenda o silueta..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#FBFAF6]/70 border border-[#C9CDD2]/40 text-[#171B20] text-xs sm:text-sm placeholder-[#8B95A0] focus:outline-none focus:border-[#3A3F45] transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8B95A0] hover:text-[#171B20]"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[#171B20]/[0.06] hover:bg-[#171B20]/[0.12] border border-[#C9CDD2]/40 text-[#171B20] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#3A3F45]" />
                <span>Filtros</span>
                {totalActiveFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#171B20] text-[#FBFAF6] text-[10px] flex items-center justify-center">
                    {totalActiveFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Results Counter & Active Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs font-mono text-[#8B95A0]">
              <div className="flex items-center gap-2">
                <span>
                  Mostrando <strong className="text-[#171B20] font-bold">{filteredProducts.length}</strong> de{" "}
                  {productos.length} prendas
                </span>
              </div>

              {totalActiveFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[#3A3F45] hover:text-[#171B20] font-bold hover:underline transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Limpiar {totalActiveFilterCount} filtros</span>
                </button>
              )}
            </div>

            {/* Bento Gallery Products */}
            {loading ? (
              <div className="py-28 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#3A3F45] animate-spin" />
                <span className="text-xs font-mono text-[#8B95A0] uppercase tracking-widest">
                  Consultando inventario en tiempo real...
                </span>
              </div>
            ) : error ? (
              <div className="py-24 px-6 text-center rounded-3xl bg-[#F4F2EE]/70 border border-rose-500/30 space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-[#171B20]">Error al consultar el inventario</h3>
                  <p className="text-xs text-[#8B95A0]">{error}</p>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetchCatalogo({ categoria: filters.categoryId || undefined, q: search || undefined, limit: 48 })
                      .then((d) => setProductos(d?.items || []))
                      .catch((e) => setError(e?.message))
                      .finally(() => setLoading(false));
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#171B20] text-[#FBFAF6] font-bold text-xs hover:bg-[#2B3138] transition-all shadow-md"
                >
                  Reintentar Consulta
                </button>
              </div>
            ) : bentoItems.length === 0 ? (
              <div className="py-24 px-6 text-center rounded-3xl bg-[#F4F2EE]/70 border border-[#C9CDD2]/40 space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#171B20]/5 border border-[#C9CDD2]/40 text-[#3A3F45] mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-[#171B20]">No se encontraron prendas</h3>
                  <p className="text-xs text-[#8B95A0]">
                    No hay productos que coincidan con la combinación de filtros seleccionada. Prueba ajustando el rango de precio, talla o color.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-[#171B20] text-[#FBFAF6] font-bold text-xs hover:bg-[#2B3138] transition-all shadow-md"
                >
                  Restablecer Todos los Filtros
                </button>
              </div>
            ) : (
              <BentoGridCreator
                items={bentoItems}
                enableSpanning={true}
                spanConfig={dynamicSpans}
                enableLightbox={true}
                gap={16}
                borderRadius={28}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Slide-over Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#171B20]/50 backdrop-blur-md flex justify-end lg:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md h-full bg-[#F4F2EE] border-l border-[#C9CDD2]/50 p-6 overflow-y-auto shadow-2xl"
            >
              <FilterSidebar
                categorias={categorias}
                filters={filters}
                onFilterChange={setFilters}
                onReset={handleResetFilters}
                availableSizes={availableSizes}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultra-Modern Glass Footer */}
      <LiquidGlassFooter />
    </div>
  );
}
