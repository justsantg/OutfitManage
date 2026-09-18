// Constantes globales de configuración de la tienda de ropa OutfitManage

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_TIENDA_WHATSAPP_PHONE || "573001234567";

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const STORE_INFO = {
  name: "OutfitManage",
  subtitle: "Atelier & Streetwear Studio",
  tagline: "Moda contemporánea, cortes de vanguardia y textiles premium.",
  whatsappDefaultMsg: "¡Hola! Estoy visitando la tienda OutfitManage y me gustaría consultar disponibilidad de prendas y asesoría.",
};
