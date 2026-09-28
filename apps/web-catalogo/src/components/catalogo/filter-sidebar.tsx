"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, RotateCcw, Check, SlidersHorizontal, X } from "lucide-react";
import { CategoriaPublica } from "../../types/catalogo";

export interface FilterState {
  categoryId: string | null;
  tallas: string[];
  colores: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export interface FilterSidebarProps {
  categorias: CategoriaPublica[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  availableSizes?: string[];
  availableColors?: string[];
  maxProductPrice?: number;
  className?: string;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

const DEFAULT_SIZES = [
  "XXS / 26",
  "XS / 28",
  "S / 30",
  "S",
  "M / 32",
  "M",
  "L / 34",
  "L",
  "XL / 36",
  "XL",
  "XXL / 38",
  "30",
  "32",
  "34",
];

const DEFAULT_COLORS = [
  { name: "Negro", hex: "#0a0a0a" },
  { name: "Blanco", hex: "#f8f8f8" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Gris", hex: "#6b7280" },
  { name: "Beige", hex: "#d4b996" },
  { name: "Verde", hex: "#15803d" },
  { name: "Café", hex: "#78350f" },
  { name: "Rojo", hex: "#dc2626" },
];

export function FilterSidebar({
  categorias = [],
  filters,
  onFilterChange,
  onReset,
  availableSizes = DEFAULT_SIZES,
  availableColors,
  maxProductPrice = 500000,
  className = "",
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState({
    price: true,
    size: true,
    color: true,
    category: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTallaToggle = (talla: string) => {
    const isSelected = filters.tallas.includes(talla);
    const updated = isSelected
      ? filters.tallas.filter((t) => t !== talla)
      : [...filters.tallas, talla];
    onFilterChange({ ...filters, tallas: updated });
  };

  const handleColorToggle = (colorName: string) => {
    const isSelected = filters.colores.includes(colorName);
    const updated = isSelected
      ? filters.colores.filter((c) => c !== colorName)
      : [...filters.colores, colorName];
    onFilterChange({ ...filters, colores: updated });
  };

  const handleCategorySelect = (id: string | null) => {
    onFilterChange({
      ...filters,
      categoryId: filters.categoryId === id ? null : id,
    });
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, ""));
    onFilterChange({ ...filters, minPrice: val });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, ""));
    onFilterChange({ ...filters, maxPrice: val });
  };

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.tallas.length > 0 ||
    filters.colores.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null;

  return (
    <aside
      className={`w-full bg-[#F4F2EE]/75 border border-[#C9CDD2]/40 rounded-3xl p-6 backdrop-blur-xl shadow-lg space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#C9CDD2]/30">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#3A3F45]" />
          <h2 className="text-xl font-black tracking-tight text-[#171B20]">Filtrar por</h2>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs font-mono font-bold text-[#3A3F45] hover:text-[#171B20] hover:underline transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}

          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="p-1 rounded-full text-[#8B95A0] hover:text-[#171B20] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Accordion 1: Precio */}
      <div className="space-y-3 pb-4 border-b border-[#C9CDD2]/30">
        <button
          type="button"
          onClick={() => toggleSection("price")}
          className="w-full flex items-center justify-between text-sm font-bold text-[#171B20] hover:text-[#3A3F45] transition-colors"
        >
          <span>Precio</span>
          {openSections.price ? (
            <ChevronUp className="w-4 h-4 text-[#8B95A0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8B95A0]" />
          )}
        </button>

        <AnimatePresence>
          {openSections.price && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3 pt-1"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#8B95A0]">Mínimo</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8B95A0]">
                      $
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      value={filters.minPrice !== null ? filters.minPrice.toLocaleString("es-CO") : ""}
                      onChange={handleMinPriceChange}
                      className="w-full pl-7 pr-2 py-2 rounded-xl bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] text-xs font-mono placeholder-[#8B95A0] focus:outline-none focus:border-[#3A3F45] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#8B95A0]">Máximo</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8B95A0]">
                      $
                    </span>
                    <input
                      type="text"
                      placeholder={maxProductPrice.toLocaleString("es-CO")}
                      value={filters.maxPrice !== null ? filters.maxPrice.toLocaleString("es-CO") : ""}
                      onChange={handleMaxPriceChange}
                      className="w-full pl-7 pr-2 py-2 rounded-xl bg-[#FBFAF6]/80 border border-[#C9CDD2]/50 text-[#171B20] text-xs font-mono placeholder-[#8B95A0] focus:outline-none focus:border-[#3A3F45] transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accordion 2: Talla */}
      <div className="space-y-3 pb-4 border-b border-[#C9CDD2]/30">
        <button
          type="button"
          onClick={() => toggleSection("size")}
          className="w-full flex items-center justify-between text-sm font-bold text-[#171B20] hover:text-[#3A3F45] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>Talla</span>
            {filters.tallas.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#171B20]/10 text-[#171B20] text-[10px] font-mono font-bold">
                {filters.tallas.length}
              </span>
            )}
          </div>
          {openSections.size ? (
            <ChevronUp className="w-4 h-4 text-[#8B95A0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8B95A0]" />
          )}
        </button>

        <AnimatePresence>
          {openSections.size && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2 pt-1 max-h-64 overflow-y-auto pr-1"
            >
              {availableSizes.map((talla) => {
                const isSelected = filters.tallas.includes(talla);
                return (
                  <label
                    key={talla}
                    className="flex items-center gap-3 cursor-pointer py-1 text-xs text-[#2B3138] hover:text-[#171B20] transition-colors group"
                  >
                    <div
                      onClick={() => handleTallaToggle(talla)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[#171B20] border-[#171B20] text-[#FBFAF6]"
                          : "border-[#C9CDD2]/60 bg-white/60 group-hover:border-[#8B95A0]"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-mono">{talla}</span>
                  </label>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accordion 3: Color */}
      <div className="space-y-3 pb-4 border-b border-[#C9CDD2]/30">
        <button
          type="button"
          onClick={() => toggleSection("color")}
          className="w-full flex items-center justify-between text-sm font-bold text-[#171B20] hover:text-[#3A3F45] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>Color</span>
            {filters.colores.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#171B20]/10 text-[#171B20] text-[10px] font-mono font-bold">
                {filters.colores.length}
              </span>
            )}
          </div>
          {openSections.color ? (
            <ChevronUp className="w-4 h-4 text-[#8B95A0]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8B95A0]" />
          )}
        </button>

        <AnimatePresence>
          {openSections.color && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2 pt-1 max-h-56 overflow-y-auto pr-1"
            >
              {DEFAULT_COLORS.map((col) => {
                const isSelected = filters.colores.includes(col.name);
                return (
                  <label
                    key={col.name}
                    className="flex items-center justify-between cursor-pointer py-1 text-xs text-[#2B3138] hover:text-[#171B20] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => handleColorToggle(col.name)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#171B20] border-[#171B20] text-[#FBFAF6]"
                            : "border-[#C9CDD2]/60 bg-white/60 group-hover:border-[#8B95A0]"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{col.name}</span>
                    </div>

                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#C9CDD2]/70 shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    />
                  </label>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accordion 4: Categorías */}
      {categorias.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => toggleSection("category")}
            className="w-full flex items-center justify-between text-sm font-bold text-[#171B20] hover:text-[#3A3F45] transition-colors"
          >
            <span>Categoría</span>
            {openSections.category ? (
              <ChevronUp className="w-4 h-4 text-[#8B95A0]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8B95A0]" />
            )}
          </button>

          <AnimatePresence>
            {openSections.category && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 pt-1"
              >
                {categorias.map((cat) => {
                  const isSelected = filters.categoryId === cat.id;
                  return (
                    <label
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className="flex items-center justify-between cursor-pointer py-1 text-xs text-[#2B3138] hover:text-[#171B20] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[#171B20] border-[#171B20] text-[#FBFAF6]"
                              : "border-[#C9CDD2]/60 bg-white/60 group-hover:border-[#8B95A0]"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="line-clamp-1">{cat.nombre}</span>
                      </div>

                      {cat._count?.productos !== undefined && (
                        <span className="text-[10px] font-mono text-[#8B95A0]">
                          {cat._count.productos}
                        </span>
                      )}
                    </label>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </aside>
  );
}

export default FilterSidebar;
