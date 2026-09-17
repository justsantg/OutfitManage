/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empaquetado standalone solo en el build de Docker (BUILD_STANDALONE=1). En Windows el
  // trazado de archivos standalone usa symlinks que el SO bloquea (EPERM); el build local no lo
  // necesita, y el build Linux de Docker sí lo activa. (Fase 6 / ADR-005.)
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  async headers() {
    // Cabeceras de seguridad obligatorias en producción (SRS Sección 5).
    return [
      {
        source: '/:path*',
        headers: [
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
