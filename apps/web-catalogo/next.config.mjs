/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empaquetado standalone solo en el build de Docker (BUILD_STANDALONE=1). En Windows el
  // trazado de archivos standalone usa symlinks que el SO bloquea (EPERM); el build local no lo
  // necesita, y el build Linux de Docker sí lo activa. (Fase 6 / ADR-005.)
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      // El storage real de este backend es Supabase (ver .env.example), no Cloudinary —
      // sin esta entrada, next/image falla en producción para toda imagen de producto.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:3000';
    return [
      {
        source: '/backend-api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/backend-public/:path*',
        destination: `${backendUrl}/public/:path*`,
      },
    ];
  },
  async headers() {
    // Cabeceras de seguridad obligatorias en producción (SRS Sección 5).
    //
    // script-src incluye 'unsafe-inline': verificado en runtime (next start + inspección del
    // HTML servido) que el App Router de Next.js 15 inyecta ~8 <script> inline sin `src`
    // (self.__next_f.push(...)) para el streaming de RSC — con script-src 'self' a secas,
    // React nunca hidrata y el sitio queda sin interactividad. La alternativa correcta es CSP
    // por nonce vía middleware.ts, pero requiere verificación en navegador real que no fue
    // posible en esta sesión (sin entorno con base de datos) — queda como mejora documentada
    // en Markdowns/todo.md, no aplicada a ciegas.
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // images.unsplash.com: fotos editoriales del landing y del catálogo (<img> y
              // texturas WebGL de HeroTunnel); sin esta entrada la CSP las bloquea.
              "img-src 'self' data: https://*.supabase.co https://images.unsplash.com",
              "media-src 'self' https://*.supabase.co",
              "connect-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
