import { MessageCircle, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { getWhatsAppUrl } from '../lib/constants';

export default function Footer() {
  const storeName = process.env.NEXT_PUBLIC_TIENDA_NOMBRE || 'OutfitManage';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800/80 bg-[#060911] text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Info Tienda */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white tracking-tight">{storeName}</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Catálogo virtual interactivo. Consulta las prendas disponibles en tiempo real y realiza tus pedidos directamente por WhatsApp con atención personalizada.
            </p>
          </div>

          {/* Características de Confianza */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Atención y Garantía</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Prendas seleccionadas de alta calidad</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Disponibilidad de stock en tiempo real</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Envíos a todo el país</span>
              </li>
            </ul>
          </div>

          {/* Contacto Directo */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Canal Oficial de Pedidos</h4>
            <p className="text-sm">
              ¿Tienes dudas con tu talla o color? Escríbenos directamente y un asesor te atenderá al instante.
            </p>
            <a
              href={getWhatsAppUrl('¡Hola! Me gustaría comunicarme con un asesor de la tienda.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chatear con un asesor</span>
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} {storeName}. Todos los derechos reservados.</p>
          <p className="text-slate-500">
            Desarrollado con arquitectura <span className="text-slate-400 font-medium">Tienda360</span> (Instalación Dedicada)
          </p>
        </div>
      </div>
    </footer>
  );
}
