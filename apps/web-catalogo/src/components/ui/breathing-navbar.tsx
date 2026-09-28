"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, MessageCircle, User, LogOut, LayoutDashboard, Store, Warehouse } from "lucide-react";
import { getWhatsAppUrl, STORE_INFO } from "../../lib/constants";
import { useAuth } from "../../lib/auth-context";

export interface NavLinkItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface BreathingNavbarProps {
  logoText?: string;
  links?: NavLinkItem[];
  ctaText?: string;
  ctaHref?: string;
  className?: string;
}

const DEFAULT_LINKS: NavLinkItem[] = [
  { label: "Catálogo", href: "/catalogo" },
  { label: "Vitrina", href: "/#catalogo-bento" },
  { label: "Lookbook", href: "/#scroller-editorial" },
  { label: "Manifiesto", href: "/#manifiesto" },
  { label: "Sede", href: "/#ubicacion" },
];

export function BreathingNavbar({
  logoText = "OUTFIT",
  links = DEFAULT_LINKS,
  ctaText = "WhatsApp",
  ctaHref = getWhatsAppUrl(STORE_INFO.whatsappDefaultMsg),
  className = "",
}: BreathingNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { user, logout } = useAuth();

  return (
    <header className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl pointer-events-auto ${className}`}>
      <motion.nav
        layout
        className="relative w-full rounded-[32px] bg-[#F4F2EE]/85 backdrop-blur-2xl border border-[#C9CDD2]/40 shadow-[0px_8px_30px_-10px_rgba(0,0,0,0.12),inset_0px_1px_0px_0px_rgba(255,255,255,0.5),0px_0px_20px_-6px_rgba(139,149,160,0.15)] opacity-100"
      >
        {/* Breathing ambient glow effect */}
        <motion.div
          className="absolute -top-12 left-10 w-[300px] h-[130px] rounded-full pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(201, 205, 210, 0.3) 0%, rgba(233, 237, 239, 0.2) 50%, rgba(0, 0, 0, 0) 100%)",
            filter: "blur(32px)",
          }}
          animate={{
            x: [0, 420, 0],
            opacity: [0.5, 0.85, 0.5],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main Navigation Bar */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-2.5 h-[62px] gap-2">
          {/* Brand Logo with rotating asterisk */}
          <Link
            href="/"
            className="flex items-center gap-2 text-[#171B20] font-black tracking-widest text-base sm:text-lg group shrink-0"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 flex items-center justify-center text-[#8B95A0] group-hover:text-[#3A3F45] transition-colors"
            >
              <Sparkles className="w-4 h-4 fill-current" />
            </motion.div>
            <span className="font-mono">{logoText}</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-0.5 shrink-0">
            {links.map((link, idx) => (
              <Link
                key={link.label}
                href={link.href}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-[#8B95A0] hover:text-[#171B20] transition-colors whitespace-nowrap"
              >
                {hoveredIdx === idx && (
                  <motion.div
                    layoutId="breathing-nav-pill"
                    className="absolute inset-0 rounded-full bg-[#171B20]/[0.06] border border-[#C9CDD2]/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${link.href === "/catalogo" ? "text-[#3A3F45] font-bold" : ""}`}>
                  {link.label}
                  {link.href === "/catalogo" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3A3F45] animate-pulse inline-block" />
                  )}
                </span>
              </Link>
            ))}
          </div>

          {/* Right Action: User Button + WhatsApp CTA + Mobile Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* User Auth Section */}
            {user ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-[#171B20]/[0.05] border border-[#C9CDD2]/30 rounded-full pl-3 pr-1.5 py-1 text-xs whitespace-nowrap shrink-0">
                {user.rol === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-400/30 px-2 py-0.5 rounded-full hover:bg-sky-500/20 transition-all mr-0.5"
                  >
                    <LayoutDashboard className="w-3 h-3" />
                    <span>Admin</span>
                  </Link>
                )}
                {user.rol === "VENDEDOR" && (
                  <Link
                    href="/admin/ventas"
                    className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-400/30 px-2 py-0.5 rounded-full hover:bg-emerald-500/20 transition-all mr-0.5"
                  >
                    <Store className="w-3 h-3" />
                    <span>Terminal Ventas</span>
                  </Link>
                )}
                {user.rol === "BODEGA" && (
                  <Link
                    href="/admin/inventario"
                    className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full hover:bg-amber-500/20 transition-all mr-0.5"
                  >
                    <Warehouse className="w-3 h-3" />
                    <span>Bodega</span>
                  </Link>
                )}
                <span className="font-medium text-[#2B3138] max-w-[90px] truncate">
                  {user.nombre}
                </span>
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-1 rounded-full text-[#8B95A0] hover:text-rose-400 hover:bg-rose-500/20 transition-colors ml-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171B20]/[0.06] hover:bg-[#171B20]/[0.1] border border-[#C9CDD2]/30 text-[#8B95A0] hover:text-[#171B20] text-xs font-semibold transition-all active:scale-95 shadow-sm whitespace-nowrap shrink-0"
              >
                <User className="w-3.5 h-3.5 text-[#8B95A0]" />
                <span>Ingresar</span>
              </Link>
            )}

            {/* WhatsApp CTA Button */}
            <a
              href={ctaHref}
              target={ctaHref.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#171B20] text-[#FBFAF6] font-bold text-xs hover:bg-[#2B3138] transition-all active:scale-95 shadow-md group whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#FBFAF6] group-hover:scale-110 transition-transform" />
              <span>{ctaText}</span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-full bg-[#171B20]/[0.06] text-[#171B20] hover:bg-[#171B20]/[0.12] transition-colors"
              aria-label="Abrir menú"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[#C9CDD2]/30 px-4 py-4 space-y-3 bg-[#F4F2EE]/90 backdrop-blur-3xl rounded-b-[32px]"
            >
              <div className="flex flex-col space-y-2">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-[#8B95A0] hover:text-[#171B20] hover:bg-[#171B20]/[0.05] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="pt-2 border-t border-[#C9CDD2]/30 space-y-2">
                {user ? (
                  <div className="p-3 rounded-2xl bg-[#171B20]/[0.05] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#2B3138]">{user.nombre}</span>
                    <div className="flex items-center gap-3">
                      {user.rol === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsOpen(false)}
                          className="text-xs text-sky-400 underline font-bold"
                        >
                          Panel Admin
                        </Link>
                      )}
                      {user.rol === "VENDEDOR" && (
                        <Link
                          href="/admin/ventas"
                          onClick={() => setIsOpen(false)}
                          className="text-xs text-emerald-400 underline font-bold"
                        >
                          Terminal Ventas
                        </Link>
                      )}
                      {user.rol === "BODEGA" && (
                        <Link
                          href="/admin/inventario"
                          onClick={() => setIsOpen(false)}
                          className="text-xs text-amber-400 underline font-bold"
                        >
                          Bodega
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          logout();
                        }}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Salir
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-2.5 rounded-full bg-[#171B20]/[0.06] border border-[#C9CDD2]/30 text-[#171B20] font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4 text-[#8B95A0]" />
                    <span>Iniciar Sesión / Registro</span>
                  </Link>
                )}

                <a
                  href={ctaHref}
                  target={ctaHref.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 rounded-full bg-[#171B20] text-[#FBFAF6] font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageCircle className="w-4 h-4 text-[#FBFAF6]" />
                  <span>{ctaText}</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}

export default BreathingNavbar;
