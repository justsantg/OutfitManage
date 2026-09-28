"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingBag,
  Store,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  Sparkles,
  ArrowLeftRight,
  Receipt,
  Loader2,
  RefreshCw,
  X,
  Tag,
  Flame,
  Check,
  Shirt,
  Calendar,
  Layers,
} from "lucide-react";
import { adminApi } from "../../../lib/admin-api";
import { useAuth } from "../../../lib/auth-context";
import { useToast } from "../../../lib/toast-context";
import { formatCurrency } from "../../../lib/api";
import { Categoria, Ubicacion, TipoMovimiento } from "../../../types/admin";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { Pagination } from "../../../components/ui/Pagination";

interface ItemStockRapido {
  varianteId: string;
  skuCode: string;
  productoId: string;
  productoNombre: string;
  categoria: string;
  talla: string;
  color: string;
  precio: number | null;
  imagenUrl: string | null;
  totalStock: number;
  saldos: {
    ubicacionId: string;
    nombre: string;
    tipo: "BODEGA" | "TIENDA";
    cantidad: number;
  }[];
}

const PRESET_COLORS = [
  { name: "Negro", hex: "#0a0a0a" },
  { name: "Blanco", hex: "#ffffff" },
  { name: "Azul Marino", hex: "#1e3a8a" },
  { name: "Gris", hex: "#6b7280" },
  { name: "Beige", hex: "#d4b996" },
  { name: "Verde Olivo", hex: "#3f6212" },
  { name: "Café", hex: "#78350f" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Vino", hex: "#881337" },
  { name: "Kaki", hex: "#a3907c" },
];

function getColorHex(colorName: string): string {
  const match = PRESET_COLORS.find(
    (c) => c.name.toLowerCase() === colorName.toLowerCase()
  );
  return match ? match.hex : "#4b5563";
}

export default function AdminVentasTerminalPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ItemStockRapido[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [selectedUbicacionId, setSelectedUbicacionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Active view: "terminal" | "historial"
  const [activeTab, setActiveTab] = useState<"terminal" | "historial">("terminal");
  const [ventasHoy, setVentasHoy] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialPageSize, setHistorialPageSize] = useState(10);

  // Sale Modal state
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState<ItemStockRapido | null>(null);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleUbicacionId, setSaleUbicacionId] = useState("");
  const [saleMotivo, setSaleMotivo] = useState("Venta en mostrador / pedido cerrado");
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Size Exchange Modal state
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [exchangeUbicacionId, setExchangeUbicacionId] = useState("");
  const [exchangeItemOld, setExchangeItemOld] = useState<ItemStockRapido | null>(null);
  const [exchangeItemNew, setExchangeItemNew] = useState<ItemStockRapido | null>(null);
  const [exchangeMotivo, setExchangeMotivo] = useState("Cambio de talla por solicitud del cliente");
  const [isProcessingExchange, setIsProcessingExchange] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [resStock, resUbis, resCats] = await Promise.all([
        adminApi.buscarStockRapido(),
        adminApi.getUbicaciones(),
        adminApi.getCategorias(),
      ]);

      setItems(resStock.items || []);
      setUbicaciones(resUbis || []);
      setCategorias(resCats || []);

      if (resUbis.length > 0) {
        // Default to first tienda, or first location
        const firstTienda = resUbis.find((u: Ubicacion) => u.tipo === "TIENDA") || resUbis[0];
        setSelectedUbicacionId(firstTienda.id);
        setSaleUbicacionId(firstTienda.id);
        setExchangeUbicacionId(firstTienda.id);
      }
    } catch (err) {
      console.error("Error cargando terminal de ventas:", err);
      toast.error("Error al cargar inventario para la terminal de ventas.");
    } finally {
      setLoading(false);
    }
  };

  // Perform search
  const performSearch = async (searchTerm: string, catId: string) => {
    setSearching(true);
    try {
      const res = await adminApi.buscarStockRapido(
        searchTerm || undefined,
        catId !== "all" ? catId : undefined
      );
      setItems(res.items || []);
    } catch (err) {
      console.error("Error en búsqueda omnicanal:", err);
    } finally {
      setSearching(false);
    }
  };

  // Load seller's recent sales
  const loadVentasHoy = async () => {
    setLoadingHistorial(true);
    try {
      const res = await adminApi.getMovimientos(1, 30, "SALIDA");
      setVentasHoy(res.items || []);
    } catch (err) {
      console.error("Error cargando historial de ventas:", err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search, selectedCategoriaId);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedCategoriaId]);

  // Open Sale Modal
  const handleOpenSaleModal = (item: ItemStockRapido) => {
    setSelectedItemForSale(item);
    setSaleQuantity(1);
    setSaleMotivo("Venta en mostrador / pedido cerrado");
    // Ensure selected sale location has stock if possible
    const currentLocStock = item.saldos.find((s) => s.ubicacionId === selectedUbicacionId)?.cantidad ?? 0;
    if (currentLocStock > 0) {
      setSaleUbicacionId(selectedUbicacionId);
    } else {
      const firstWithStock = item.saldos.find((s) => s.cantidad > 0);
      setSaleUbicacionId(firstWithStock?.ubicacionId || selectedUbicacionId);
    }
    setSaleModalOpen(true);
  };

  // Execute Sale (SALIDA)
  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForSale) return;

    const chosenUbicacion = ubicaciones.find((u) => u.id === saleUbicacionId);
    const storeName = chosenUbicacion?.nombre || "la sede seleccionada";

    const locStock =
      selectedItemForSale.saldos.find((s) => s.ubicacionId === saleUbicacionId)?.cantidad ?? 0;

    if (locStock < saleQuantity) {
      toast.warning(
        `Stock insuficiente en ${storeName}. Solo hay ${locStock} unidad(es) disponible(s) y solicitaste ${saleQuantity}.`,
        "Stock Insuficiente"
      );
      return;
    }

    setIsProcessingSale(true);
    try {
      await adminApi.createMovimiento({
        varianteId: selectedItemForSale.varianteId,
        ubicacionId: saleUbicacionId,
        tipo: "SALIDA" as TipoMovimiento,
        cantidad: saleQuantity,
        motivo: saleMotivo || "Venta en mostrador",
      });

      toast.success(
        `Venta registrada en ${storeName}: ${saleQuantity}x ${selectedItemForSale.productoNombre} (${selectedItemForSale.color} / ${selectedItemForSale.talla}).`,
        "¡Venta Registrada Exitosamente!"
      );

      setSaleModalOpen(false);
      // Refresh current stock
      performSearch(search, selectedCategoriaId);
      if (activeTab === "historial") loadVentasHoy();
    } catch (err: any) {
      const errorMsg = err.message || "Error al registrar la venta.";
      toast.error(errorMsg, "No se pudo registrar la venta");
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Open Exchange Modal
  const handleOpenExchangeModal = (oldItem: ItemStockRapido) => {
    setExchangeItemOld(oldItem);
    const ubiToUse = selectedUbicacionId || ubicaciones[0]?.id || "";
    setExchangeUbicacionId(ubiToUse);
    // Find sister variants of the same product
    const candidate = items.find(
      (it) => it.productoId === oldItem.productoId && it.varianteId !== oldItem.varianteId && it.totalStock > 0
    );
    setExchangeItemNew(candidate || null);
    setExchangeMotivo("Cambio de talla por solicitud del cliente");
    setExchangeModalOpen(true);
  };

  // Execute Size Exchange (Atomic: DEVOLUCION + SALIDA)
  const handleConfirmExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeItemOld || !exchangeItemNew) {
      toast.warning(
        "Debes seleccionar la prenda que entrega el cliente y la nueva prenda que recibe.",
        "Selección Incompleta"
      );
      return;
    }

    const ubiToUse = exchangeUbicacionId || selectedUbicacionId;
    const chosenUbicacion = ubicaciones.find((u) => u.id === ubiToUse);
    const storeName = chosenUbicacion?.nombre || "la sede seleccionada";

    const locStock =
      exchangeItemNew.saldos.find((s) => s.ubicacionId === ubiToUse)?.cantidad ?? 0;

    if (locStock < 1) {
      const otherStoresWithStock = exchangeItemNew.saldos.filter(
        (s) => s.ubicacionId !== ubiToUse && s.cantidad > 0
      );
      const otherStoresText =
        otherStoresWithStock.length > 0
          ? ` Existen existencias en: ${otherStoresWithStock.map((s) => `${s.nombre} (${s.cantidad} u.)`).join(", ")}.`
          : " Esta prenda no tiene existencias en ninguna sede.";

      toast.warning(
        `No hay stock disponible de la talla ${exchangeItemNew.talla} (${exchangeItemNew.color}) en ${storeName} (Disponible: 0 u.).${otherStoresText}`,
        "Stock Insuficiente para Cambio"
      );
      return;
    }

    setIsProcessingExchange(true);
    try {
      // 1. Reingreso de la prenda vieja (DEVOLUCION)
      await adminApi.createMovimiento({
        varianteId: exchangeItemOld.varianteId,
        ubicacionId: ubiToUse,
        tipo: "DEVOLUCION" as TipoMovimiento,
        cantidad: 1,
        motivo: `Reingreso por cambio de talla: ${exchangeMotivo}`,
      });

      // 2. Salida de la nueva prenda entregada (SALIDA)
      await adminApi.createMovimiento({
        varianteId: exchangeItemNew.varianteId,
        ubicacionId: ubiToUse,
        tipo: "SALIDA" as TipoMovimiento,
        cantidad: 1,
        motivo: `Entrega por cambio de talla (Entregó SKU: ${exchangeItemOld.skuCode})`,
      });

      toast.success(
        `Cambio completado en ${storeName}: Reingresó Talla ${exchangeItemOld.talla} (${exchangeItemOld.color}) y se entregó Talla ${exchangeItemNew.talla} (${exchangeItemNew.color}).`,
        "¡Cambio de Talla Registrado!"
      );

      setExchangeModalOpen(false);
      performSearch(search, selectedCategoriaId);
      if (activeTab === "historial") loadVentasHoy();
    } catch (err: any) {
      const errorMsg = err.message || "Error al procesar el cambio de talla.";
      toast.error(errorMsg, "No se pudo realizar el cambio");
    } finally {
      setIsProcessingExchange(false);
    }
  };

  const currentUbicacionObj = ubicaciones.find((u) => u.id === selectedUbicacionId);

  return (
    <div className="space-y-6">
      {/* Header & Role Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                <span>Terminal de Consulta &amp; Registro de Ventas</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {user?.rol || "VENDEDOR"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consulta existencias en &lt; 3 segundos y registra salidas por venta o cambios de talla en 1 clic.
              </p>
            </div>
          </div>
        </div>

        {/* Store Location Selector */}
        <div className="flex items-center gap-3">
          <div className="w-full sm:w-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Store className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="text-left flex-1 sm:flex-initial">
              <span className="block text-[9px] font-mono uppercase text-slate-400 font-bold">
                Mi Sede Activa
              </span>
              <select
                value={selectedUbicacionId}
                onChange={(e) => {
                  setSelectedUbicacionId(e.target.value);
                  setSaleUbicacionId(e.target.value);
                }}
                className="w-full sm:w-auto text-xs font-bold bg-transparent text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Terminal vs Historial */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 max-w-md w-full">
        <button
          type="button"
          onClick={() => setActiveTab("terminal")}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
            activeTab === "terminal"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Search className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Terminal</span>
            <span className="hidden sm:inline">Terminal de Consulta &amp; Venta</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("historial");
            loadVentasHoy();
          }}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
            activeTab === "historial"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Ventas Hoy</span>
            <span className="hidden sm:inline">Ventas Recientes</span>
          </span>
        </button>
      </div>

      {activeTab === "terminal" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Fast Search Box */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Escribe el nombre de la prenda, talla (S, M, L), color o código SKU..."
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl text-sm sm:text-base font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategoriaId("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                  !selectedCategoriaId
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Todas las Categorías
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoriaId(cat.id === selectedCategoriaId ? "" : cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                    selectedCategoriaId === cat.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          {loading || searching ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-xs font-mono">Buscando existencias en tiempo real...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Shirt className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No encontramos prendas con "{search}"
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Intenta buscando por código SKU, color (*Negro*, *Azul*) o talla (*M*, *L*).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const stockInMyStore =
                  item.saldos.find((s) => s.ubicacionId === selectedUbicacionId)?.cantidad || 0;
                const stockInOtherStores = item.saldos
                  .filter((s) => s.ubicacionId !== selectedUbicacionId)
                  .reduce((sum, s) => sum + s.cantidad, 0);

                const isOutOfStockEverywhere = item.totalStock === 0;

                return (
                  <div
                    key={item.varianteId}
                    className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-950 border flex flex-col justify-between space-y-4 shadow-sm hover:border-emerald-500/40 transition-all ${
                      isOutOfStockEverywhere
                        ? "border-rose-200 dark:border-rose-900/40 opacity-70"
                        : stockInMyStore > 0
                        ? "border-emerald-200 dark:border-emerald-900/40"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Mini Photo + Info */}
                      <div className="flex gap-3 items-start">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 relative">
                          {item.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imagenUrl}
                              alt={item.productoNombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Shirt className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block truncate">
                            {item.categoria}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">
                            {item.productoNombre}
                          </h3>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                              {item.precio ? formatCurrency(item.precio) : "Sin precio"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              {item.skuCode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Variant Specs: Color & Size */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-900">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: getColorHex(item.color) }}
                          />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.color}
                          </span>
                        </div>

                        <div className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-black text-slate-900 dark:text-white">
                          Talla: {item.talla}
                        </div>
                      </div>

                      {/* Stock Breakdown by Location */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between font-bold gap-2">
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0">
                            <Store className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">En {currentUbicacionObj?.nombre || "Mi Tienda"}:</span>
                          </span>
                          <span
                            className={`shrink-0 ${
                              stockInMyStore > 0
                                ? "text-emerald-600 dark:text-emerald-400 font-black"
                                : "text-rose-500 font-black"
                            }`}
                          >
                            {stockInMyStore > 0 ? `${stockInMyStore} u.` : "Agotado"}
                          </span>
                        </div>

                        {item.saldos
                          .filter((s) => s.ubicacionId !== selectedUbicacionId)
                          .map((s) => (
                            <div
                              key={s.ubicacionId}
                              className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400"
                            >
                              <span className="flex items-center gap-1 min-w-0 truncate">
                                {s.tipo === "BODEGA" ? (
                                  <Warehouse className="w-3 h-3 text-indigo-400 shrink-0" />
                                ) : (
                                  <Store className="w-3 h-3 text-sky-400 shrink-0" />
                                )}
                                <span className="truncate">{s.nombre}:</span>
                              </span>
                              <span className={`shrink-0 font-mono ${s.cantidad > 0 ? "text-indigo-400 font-bold" : "text-slate-500"}`}>
                                {s.cantidad} u.
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                      <button
                        type="button"
                        onClick={() => handleOpenSaleModal(item)}
                        disabled={item.totalStock === 0}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-30"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Registrar Venta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenExchangeModal(item)}
                        title="Cambio de talla"
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Sales History Tab */}
      {activeTab === "historial" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Últimas Ventas y Salidas Registradas
            </h3>
            <button
              onClick={loadVentasHoy}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar</span>
            </button>
          </div>

          {loadingHistorial ? (
            <div className="p-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : ventasHoy.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              No hay salidas registradas recientemente.
            </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {ventasHoy
                  .slice((historialPage - 1) * historialPageSize, historialPage * historialPageSize)
                  .map((mov) => (
                    <div
                      key={mov.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {mov.variante?.producto?.nombre}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono font-bold">
                            {mov.variante?.color} · {mov.variante?.talla}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {mov.variante?.skuCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {mov.motivo || "Venta en tienda"} · Sede: {mov.ubicacion?.nombre}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="font-mono font-bold text-rose-500 text-sm block">
                            -{mov.cantidad} u.
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(mov.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={historialPage}
                totalPages={Math.ceil(ventasHoy.length / historialPageSize) || 1}
                totalItems={ventasHoy.length}
                itemsPerPage={historialPageSize}
                onPageChange={setHistorialPage}
                onItemsPerPageChange={(newSize) => {
                  setHistorialPageSize(newSize);
                  setHistorialPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Sale Registration Modal */}
      {saleModalOpen && selectedItemForSale && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Registrar Venta / Salida
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Descargo de inventario en tiempo real
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSaleModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmSale} className="space-y-4">
                {/* Product Summary */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    {selectedItemForSale.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedItemForSale.imagenUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Shirt className="w-full h-full p-2 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {selectedItemForSale.productoNombre}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span>{selectedItemForSale.color}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Talla {selectedItemForSale.talla}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-emerald-500">
                        {selectedItemForSale.precio ? formatCurrency(selectedItemForSale.precio) : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
                    Cantidad a Vender:
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSaleQuantity(Math.max(1, saleQuantity - 1))}
                      className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min={1}
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-2.5 text-center text-lg font-mono font-black bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() => setSaleQuantity(saleQuantity + 1)}
                      className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sale Location Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
                    Sede de Salida:
                  </label>
                  <select
                    value={saleUbicacionId}
                    onChange={(e) => setSaleUbicacionId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    {ubicaciones.map((u) => {
                      const locStock =
                        selectedItemForSale.saldos.find((s) => s.ubicacionId === u.id)?.cantidad ?? 0;
                      return (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({locStock} u. disponibles)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Real-time Sale Stock Warning */}
                {(() => {
                  const locStock =
                    selectedItemForSale.saldos.find((s) => s.ubicacionId === saleUbicacionId)?.cantidad ?? 0;
                  const chosenUbi = ubicaciones.find((u) => u.id === saleUbicacionId);
                  if (locStock < saleQuantity) {
                    return (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          Stock insuficiente en {chosenUbi?.nombre || "esta sede"} (Disponible: {locStock} u., Solicitado: {saleQuantity} u.)
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Stock disponible:</span>
                      </span>
                      <span className="font-bold">{locStock} u.</span>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSaleModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isProcessingSale ||
                      (selectedItemForSale.saldos.find((s) => s.ubicacionId === saleUbicacionId)?.cantidad ?? 0) < saleQuantity
                    }
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingSale ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Confirmar Venta</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Size Exchange Modal */}
      {exchangeModalOpen && exchangeItemOld && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Cambio de Talla / Prenda
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Devolución (+1) y Entrega de nueva talla (-1)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExchangeModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmExchange} className="space-y-4">
                {/* Selector de Sede del Cambio */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
                    Sede donde se realiza el cambio:
                  </label>
                  <select
                    value={exchangeUbicacionId}
                    onChange={(e) => setExchangeUbicacionId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.tipo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 1. Prenda que entrega el cliente (DEVOLUCION) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 block">
                    1. Prenda que entrega el cliente (Reingreso +1):
                  </span>
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-mono">
                    <strong className="text-slate-900 dark:text-white block">
                      {exchangeItemOld.productoNombre}
                    </strong>
                    <span className="text-slate-500">
                      Color: {exchangeItemOld.color} · Talla: {exchangeItemOld.talla} (SKU: {exchangeItemOld.skuCode})
                    </span>
                  </div>
                </div>

                {/* 2. Nueva prenda que se lleva el cliente (SALIDA) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-500 block">
                    2. Nueva prenda a entregar (Salida -1):
                  </span>
                  <select
                    value={exchangeItemNew?.varianteId || ""}
                    onChange={(e) => {
                      const match = items.find((it) => it.varianteId === e.target.value);
                      setExchangeItemNew(match || null);
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Selecciona la nueva variante...</option>
                    {/* Variantes del mismo producto */}
                    <optgroup label="Tallas / Colores de este Producto">
                      {items
                        .filter(
                          (it) =>
                            it.productoId === exchangeItemOld.productoId &&
                            it.varianteId !== exchangeItemOld.varianteId
                        )
                        .map((it) => {
                          const localStock =
                            it.saldos.find((s) => s.ubicacionId === exchangeUbicacionId)?.cantidad ?? 0;
                          return (
                            <option key={it.varianteId} value={it.varianteId}>
                              {it.color} · Talla {it.talla} (SKU: {it.skuCode}) — [En sede: {localStock} u. / Total: {it.totalStock} u.]
                            </option>
                          );
                        })}
                    </optgroup>
                    {/* Otras prendas del catálogo */}
                    <optgroup label="Otras Prendas Disponibles">
                      {items
                        .filter((it) => it.productoId !== exchangeItemOld.productoId && it.totalStock > 0)
                        .map((it) => {
                          const localStock =
                            it.saldos.find((s) => s.ubicacionId === exchangeUbicacionId)?.cantidad ?? 0;
                          return (
                            <option key={it.varianteId} value={it.varianteId}>
                              {it.productoNombre} ({it.color} / Talla {it.talla}) — [En sede: {localStock} u.]
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>

                  {/* Feedback visual de stock para la prenda de cambio */}
                  {exchangeItemNew && (() => {
                    const localStock =
                      exchangeItemNew.saldos.find((s) => s.ubicacionId === exchangeUbicacionId)?.cantidad ?? 0;
                    const storeName =
                      ubicaciones.find((u) => u.id === exchangeUbicacionId)?.nombre || "esta sede";
                    const otherStoresWithStock = exchangeItemNew.saldos.filter(
                      (s) => s.ubicacionId !== exchangeUbicacionId && s.cantidad > 0
                    );

                    if (localStock > 0) {
                      return (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Disponible en {storeName}:</span>
                          </span>
                          <span className="font-black text-sm">{localStock} u.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Sin existencias en {storeName} (0 u.)</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                          {otherStoresWithStock.length > 0 ? (
                            <>
                              Hay stock en otras sedes:{" "}
                              <strong>
                                {otherStoresWithStock
                                  .map((s) => `${s.nombre} (${s.cantidad} u.)`)
                                  .join(", ")}
                              </strong>
                              . Solicita un traslado a Bodega o selecciona una sede/talla con existencias.
                            </>
                          ) : (
                            <>Esta prenda se encuentra totalmente agotada en todas las sedes.</>
                          )}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Motivo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Motivo del Cambio:
                  </label>
                  <input
                    type="text"
                    required
                    value={exchangeMotivo}
                    onChange={(e) => setExchangeMotivo(e.target.value)}
                    placeholder="Ej: Le quedó pequeña / Desea otra talla"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setExchangeModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isProcessingExchange ||
                      !exchangeItemNew ||
                      (exchangeItemNew.saldos.find((s) => s.ubicacionId === exchangeUbicacionId)?.cantidad ?? 0) < 1
                    }
                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingExchange ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Procesar Cambio</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
