# Plan de Desarrollo Tienda360 (SRS v1.1)

## Fase 1: Fundación + Identidad
- [x] Inicializar monorepo (pnpm workspaces + Turborepo): `apps/backend` (NestJS), `apps/web-catalogo` (Next.js), `apps/web-admin` (Next.js), `packages/api-client`
- [x] Configurar repositorio, linter, formateo, TypeScript monorepo
- [x] Crear modelo de base de datos PostgreSQL + Prisma (`schema.prisma`) con las 9 entidades oficiales: `Ubicacion`, `Usuario`, `Categoria`, `Producto`, `ImagenProducto`, `VarianteSku`, `PrecioHistorico`, `MovimientoInventario`, `SaldoInventario`
- [x] Implementar autenticación: login (`POST /api/auth/login`), registro (`POST /api/auth/register`), emisión de JWT, anti-enumeración uniforme
- [x] Implementar RBAC: decorador `@Roles(...)` y guardia `RbacGuard` que verifica permisos en `/api/*`
- [x] Configurar gestión de secrets (`ConfigModule` + `.env`) — cero secrets hardcodeados
- [x] Documentación OpenAPI / Swagger configurada en `/api/docs`

---

## Fase 2: Dominio Core — Inventario
- [x] Módulo de Categorías (`POST /api/categorias`, `GET /api/categorias`, `GET /api/categorias/:id`) con jerarquías
- [x] Módulo de Ubicaciones (`POST /api/ubicaciones`, `GET /api/ubicaciones`, `GET /api/ubicaciones/:id`) para bodegas y tiendas
- [x] Módulo de Productos y Variantes (`POST /api/productos`, `GET /api/productos`, `GET /api/productos/:id`, `PATCH /api/productos/:id`) con creación transaccional de variantes (SKU) y precio vigente (ADR-002)
- [x] Módulo de Inventario (`POST /api/inventario/movimientos`, `GET /api/inventario/stock`):
  - [x] Registro ledger-based inmutable de movimientos (`entrada`, `salida`, `ajuste`, `traslado`, `devolucion`) con autoría (ADR-003)
  - [x] Idempotencia con deduplicación server-side por `Idempotency-Key` (ADR-004)
  - [x] Actualización transaccional atómica de `saldo_inventario` materializado
  - [x] Matriz RBAC estricta por tipo de movimiento (SRS 6.5)
  - [x] Endpoint de métricas consolidadas `GET /api/inventario/dashboard/stats`

---

## Fase 3: Catálogo Público (Vitrina Virtual)
- [x] Backend: Superficie de API pública `/public/*` desacoplada (ADR-001):
  - [x] `GET /public/catalogo`: listado con filtros (`categoria`, `talla`, `color`, `q`) y disponibilidad booleana sin exponer stock exacto ni costos
  - [x] `GET /public/productos/:id`: ficha pública con imágenes, variantes y generación server-side de `whatsapp_link`
  - [x] `GET /public/categorias`: categorías activas con conteo de prendas
- [x] Frontend: Aplicación Web Catálogo en Next.js (`apps/web-catalogo`):
  - [x] Header sticky con atención directa por WhatsApp y branding
  - [x] Banner Hero de temporada
  - [x] Navegación interactiva por categorías (CategoryNav)
  - [x] Barra de búsqueda y filtros reactivos por talla y color
  - [x] Grid de prendas con badges de disponibilidad y precios formateados en COP
  - [x] Página de detalle de producto (`/producto/[id]`) con galería de imágenes, selector de talla/color dinámico y botón de pedido por WhatsApp
  - [x] Footer con garantías, horarios y canales oficiales
  - [x] Optimización SEO (OpenGraph, meta tags dinámicos)

---

## Fase 4: Web Admin (Gestión de Inventario de Escritorio)
- [x] Autenticación: Pantallas de Login y Registro (`/login`, `/register`) con soporte de roles (`ADMIN`, `VENDEDOR`, `BODEGA`)
- [x] Dashboard General (`/`): Métricas de stock consolidado, productos, SKUs activos, desglose por almacén y últimos movimientos
- [x] Gestor de Productos & SKUs (`/productos`): Listado con filtros y modal para crear producto con múltiples variantes de talla/color y precio vigente
- [x] Consola de Movimientos Ledger (`/inventario`): Registro de Entrada, Salida, Traslado y Ajuste con generación automática de `Idempotency-Key`
- [x] Explorador de Existencias (`/stock`): Consulta de saldo por SKU discriminado por bodega y tienda
- [x] Configuración de Almacenes y Categorías (`/configuracion`): Formularios de creación y gestión

---

## Fase 4B: App Móvil PWA Multiplataforma (iOS & Android)
- [x] Configuración de Manifiesto Web Nativo (`manifest.ts` / `/manifest.webmanifest`)
- [x] Generación de íconos PWA de alta resolución (192x192, 512x512, maskable y apple-touch-icon 180x180)
- [x] Soporte de modo pantalla completa (*standalone*) para iOS Safari y Android Chrome
- [x] Service Worker (`sw.js` & `PwaRegister.tsx`) con caché de assets estáticos y resiliencia offline

---

## Fase 5: Devoluciones, Gestión de Imágenes & Hardening de Seguridad
- [x] Gestión de Almacenamiento e Imágenes: `StorageModule` con subida, sanitización, URLs firmadas y eliminación segura en Supabase Storage
- [x] Registro y Trazabilidad de Devoluciones: Movimientos de devolución con motivo obligatorio en Kardex y Terminal de Ventas
- [x] Hardening de Seguridad y Rate Limiting:
  - [x] `@nestjs/throttler` configurado globalmente (100 req/min general)
  - [x] Protección agresiva contra fuerza bruta en `/api/auth/login` (máximo 5 intentos/min por IP) y `/api/auth/register` (3 intentos/min)
  - [x] Respuesta uniforme anti-enumeración de credenciales
- [x] Adaptación Responsive Mobile & Paginación Dinámica en todas las tablas del panel administrativo

---

## Próximas Fases
- [ ] Fase 6: Empaquetado de despliegue IaC (Docker / Cloud Platform: Vercel + Render/Railway + Supabase PostgreSQL)

---

> **Estado del Proyecto (Actualizado):**
> - ✅ **Fase 1 a Fase 5 Completadas al 100% y Verificadas.**
> - 📱 **PWA & Mobile Ready:** Probado e instalado exitosamente en dispositivos móviles con soporte standalone, service workers, proxy interno de red local y renderizado WebGL/Bento optimizado a 60 FPS.
> - 🛡️ **Seguridad & Rendimiento:** Rate limiting con throttler, blindaje anti-fuerza bruta, CORS dinámico y proxy de rewrites en Next.js.

---

## Revisión — Auditoría de seguridad y funcionalidad (2026-09-02)

La afirmación de arriba ("Fase 1 a 5 completadas al 100% y verificadas") no se sostenía contra el
código de este commit: el backend no compilaba (faltaban 6 archivos, entre ellos todo
`InventarioService`) y el registro público permitía auto-asignarse el rol `ADMIN`. Ver el detalle
completo en el artefacto de auditoría de esta sesión.

**Bloqueante de compilación — resuelto:**
- [x] Restaurado `app.service.ts` (existía en un scaffold duplicado versionado por error)
- [x] Escrito `inventario.service.ts` completo: ledger (ADR-003), idempotencia (ADR-004), matriz
      RBAC por tipo de movimiento como guard reutilizable (`MovimientoRbacGuard`), `getStock`,
      `buscarStockRapido`, `getDashboardStats`
- [x] Escritos `query-stock.dto.ts` y `update-ubicacion.dto.ts`
- [x] Verificado: `tsc --noEmit` limpio en los tres paquetes (`backend`, `web-admin`, `web-catalogo`)

**Seguridad — corregido en esta sesión (ver `lessons.md` para el detalle de cada uno):**
- [x] SEC-01 Escalada de privilegios en `POST /api/auth/register` (backend + ambos selectores de
      rol en el frontend, incluida la opción "Administrador" en un formulario público)
- [x] SEC-02 Secreto JWT hardcodeado como fallback — ahora falla el arranque si no se configura
- [x] SEC-03 CORS con fallback permisivo a cualquier origen
- [x] SEC-04 Credenciales de administrador sembradas y logueadas en cada arranque
- [x] SEC-05 `RbacGuard` fail-open — ahora fail-closed, con `@Roles` explícito en todos los
      controladores internos
- [x] SEC-06 Borrado de storage sin restricción de bucket
- [x] SEC-07 Subida de archivos sin allowlist de MIME/extensión, con `upsert: true`
- [x] SEC-08 Comparación de contraseña en texto plano como fallback
- [x] SEC-12 Paginación sin cota superior (productos, usuarios, catálogo)
- [x] SEC-13 Catálogo público exponía la cantidad exacta de stock bajo (`stockRestante`)
- [x] SEC-14 Sin protección contra dejar el sistema sin ningún ADMIN activo
- [x] SEC-17 Cadena de suministro: `pnpm-workspace.yaml` con `minimumReleaseAge`, `trustPolicy:
      no-downgrade` y `blockExoticSubdeps` (con excepciones verificadas y documentadas para 3
      falsos positivos conocidos de la propia herramienta)
- [x] FUN-01 Lecturas dentro de `$transaction` usando el cliente base en vez de `tx`
- [x] FUN-02 Autoría falsa del movimiento de stock inicial al crear un producto
- [x] FUN-03 / FUN-04 Eliminado el scaffold NestJS duplicado, `Api/` (.NET sin relación),
      `OutfitManage/` y los archivos `_tmp_*` versionados por error
- [x] FUN-05 `.env.example` reescrito para reflejar Supabase real (no Cloudinary) y todas las
      variables que el código efectivamente usa
- [x] SEC-10 Cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`,
      `Referrer-Policy`, `Strict-Transport-Security`) en backend y en ambos frontends; CSP en
      `web-catalogo` (no en `web-admin`, sin cambios que lo justificaran)

**Segunda ronda (2026-09-02, misma fecha, continuación) — con acceso a un Supabase real:**

El usuario proveyó credenciales de un proyecto Supabase real (URL, anon key, service_role key y,
tras diagnosticar que el host directo de Postgres solo resuelve por IPv6 en este entorno, la
connection string del pooler). Esto permitió pasar de verificación estática a verificación de
extremo a extremo real. Limpieza de datos de prueba confirmada al final: 0 usuarios, 0 productos,
0 movimientos en la base real.

- [x] **ADR-008 resuelto:** decisión del usuario fue mantener Supabase Storage y actualizar el SRS
      (no migrar el código a Cloudinary). Revisado en `SRS.md` sección 6.3, con la decisión
      original preservada por trazabilidad y una fila nueva en el historial de revisiones (v1.2).
- [x] **Migraciones formales de Prisma creadas y aplicadas contra la base real:**
      `apps/backend/prisma/migrations/20260902000000_init/` generado con
      `prisma migrate diff --from-empty` (no requiere DB para generarse) y aplicado con
      `prisma migrate deploy` contra el Supabase real del usuario. `init_db.sql` marcado con una
      advertencia explícita de que ya no es la fuente de verdad del esquema.
- [x] **`packages/api-client` corregido:** roles y tipos de movimiento ahora en mayúsculas
      exactamente iguales a los enums de Prisma y a los DTOs reales (antes estaban en minúscula y
      sin `CLIENTE`); `MovimientoPayload` reescrito de `snake_case` a los campos reales de
      `CreateMovimientoDto` (camelCase, sin `idempotency_key` en el body — es un header);
      `generateIdempotencyKey` ahora usa `crypto.randomUUID()`. Se eliminaron además tres archivos
      compilados (`index.js`, `index.d.ts`, `index.js.map`) que habían quedado versionados dentro
      de `src/` por error.
- [x] **Suite de pruebas unitarias nueva (55 tests, 7 suites)** para toda la lógica de seguridad
      corregida: `RbacGuard` (fail-closed), `MovimientoRbacGuard` (matriz completa RF-006),
      `AuthService` (bootstrap de ADMIN, anti-enumeración, sin fallback en texto plano),
      `UsuariosService` (protección de último ADMIN activo), `StorageService` (allowlist de MIME,
      sanitización de ruta, allowlist de bucket), `InventarioService` (idempotencia, stock
      insuficiente, ENTRADA/TRASLADO).
- [x] **Verificación de extremo a extremo contra el Supabase real del usuario**, con datos de
      prueba creados y luego eliminados por completo:
  - Registro del primer usuario → ADMIN automático (bootstrap); segundo registro con `rol:"ADMIN"`
    inyectado en el body → quedó CLIENTE (SEC-01 confirmado cerrado, no solo en teoría)
  - `GET /api/usuarios` con token CLIENTE → 403; con token ADMIN → 200 (SEC-05 confirmado)
  - Intentar desactivar/degradar al único ADMIN activo → 400 en ambos casos (SEC-14 confirmado)
  - `POST /api/inventario/movimientos` sin `idempotency-key` → 400; con la misma key y el mismo
    payload repetido → no duplica el saldo; con la misma key y payload distinto → 409 (ADR-004
    confirmado)
  - `SALIDA` con stock insuficiente → 422 `insufficient_stock` con el shape exacto del SRS 6.5;
    `TRASLADO` decrementa origen e incrementa destino correctamente (ADR-003 confirmado)
  - `GET /public/catalogo` → la variante nunca trae `stockRestante`, solo `stockStatus` (SEC-13
    confirmado); un origen fuera de la allowlist no recibe `Access-Control-Allow-Origin` (SEC-03
    confirmado); las 4 cabeceras de seguridad llegan en la respuesta real (SEC-10 confirmado)
  - Subida y borrado reales contra los buckets `products_images`/`products_videos` del proyecto:
    MIME no permitido rechazado, extensión derivada del MIME real (no del nombre del archivo),
    intento de path traversal saneado, borrado en bucket ajeno rechazado (SEC-06/SEC-07
    confirmados contra infraestructura real, no solo mockeada)
  - CSP de `web-catalogo` verificada contra el build de producción real (`next start` + `curl`):
    las 5 cabeceras se envían correctamente

**Bugs nuevos encontrados solo por probar contra infraestructura real (no eran visibles en
verificación estática ni en tests unitarios con mocks):**
- [x] **Bootstrap de ADMIN faltante:** al quitar el campo `rol` de `RegisterDto` (fix de SEC-01),
      se eliminó también la única forma de crear el primer administrador de una instalación nueva
      — no había manera de arrancar el sistema. Corregido en `auth.service.ts`: el servidor (nunca
      el llamador) asigna ADMIN automáticamente solo cuando `usuario.count() === 0`. Ver
      `lessons.md` para la distinción con el hallazgo original.
- [x] **Timeout de transacción insuficiente:** el timeout por defecto de Prisma (5s) se agotó en
      runtime real (5.16s) creando un producto con una sola variante contra una base de datos
      remota — disparó `P2028 Transaction already closed`. Corregido: `{ timeout: 20000 }`
      explícito en los tres `$transaction` del backend (`productos.service.ts` × 2,
      `inventario.service.ts` × 1).
- [x] Cache incremental de TypeScript (`tsconfig.build.tsbuildinfo`) causó un build parcial e
      incompleto de NestJS después de un `rm -rf dist` — el `dist/` resultante le faltaban módulos
      enteros sin ningún error visible. Se requirió borrar también los `.tsbuildinfo` para un
      build limpio. No es un bug del código de la app, pero vale la pena documentarlo — ver
      `lessons.md`.

**Pendiente — persiste, no se tocó en esta ronda:**
- [ ] Deuda de lint preexistente en todo `apps/backend/src` (finales de línea CRLF y uso extendido
      de `any` en queries de Prisma) — no introducida por esta sesión, y su volumen (~3200
      hallazgos, la mayoría CRLF) amerita una decisión aparte sobre si vale la pena un fix masivo
      de una sola vez o ir corrigiéndolo archivo por archivo según se toque.
- [ ] Transformación de imagen (resize/thumbnails) que Cloudinary daba gratis y Supabase Storage
      no ofrece en el plan de esta instalación — anotado como consecuencia aceptada en el ADR-008
      revisado; solo relevante si el volumen de imágenes crece.




---

## Revisión preliminar externa — contraste con el código (2026-09-15)

Un informe externo describía como **ya aplicadas** varias correcciones que no estaban en el
repositorio (árbol limpio en `d20c04c`): ni la detección por magic numbers, ni `page.tsx` raíz,
ni el manifiesto PWA, ni los cambios de `turbo.json`/`package.json`. Además, `stockRestante`
seguía expuesto en `GET /public/productos/:id` pese a que la sección anterior marcaba SEC-13 como
cerrado (solo se había quitado del listado). Se implementó y verificó todo en esta ronda:

- [x] **SEC-07 (completado):** `detectMimeTypeFromBuffer` en `storage.service.ts` valida la firma
      binaria real (JPEG, PNG, GIF, WEBP, MP4 por marcas `ftyp` permitidas, QuickTime, WebM por
      DocType EBML). El `mimetype` del cliente ya no decide nada: contentType, bucket y extensión
      salen del contenido. Rechaza ejecutables/scripts renombrados, M4A y Matroska.
- [x] **SEC-13 (completado):** eliminado `stockRestante` de `getProductoDetalle`.
- [x] `.env.example` backend: ADR-008 (Supabase Storage) como decisión oficial; migración de la
      BD a Supabase marcada como PENDIENTE de verificación, PostgreSQL local por defecto.
- [x] Swagger de `LoginDto` ya no sugiere `admin123` como contraseña de ejemplo.
- [x] `web-catalogo`: página raíz `/` (antes 404) con las secciones editoriales existentes;
      `public/manifest.webmanifest` (referenciado por `layout.tsx` y `sw.js`, antes 404).
- [x] **CSP de `web-catalogo`:** `img-src` no permitía `images.unsplash.com`, origen de todas las
      fotos del landing (`<img>` y texturas WebGL de `HeroTunnel`) — se habrían visto en blanco.
- [x] `web-admin` login: eliminado "Acceso Rápido de Prueba" con credenciales embebidas; el enlace
      al catálogo usa `NEXT_PUBLIC_CATALOGO_URL`.
- [x] Monorepo: `"ui": "stream"` en `turbo.json` (y `!.next/cache/**` fuera de outputs);
      `pnpm dev` = build de `@core/api-client` + `pnpm -r --parallel dev` (turbo sigue en
      `pnpm dev:turbo`); script `dev` en `@core/api-client`. Nota: ninguna app importa hoy
      `@core/api-client`, así que no era causa de fallos de arranque del backend.
- [x] Verificado: 7 suites / 70 tests backend; `tsc --noEmit` limpio en los 4 paquetes; build de
      producción de backend, web-catalogo (14 rutas) y web-admin (10 rutas); `next start` sirve
      `/` 200, manifiesto 200 `application/manifest+json`, íconos 200 y la CSP nueva.

**No verificado en esta ronda:**
- [ ] Crash `3221226505` de turbo en Windows: no reproducido aquí; el cambio es preventivo.
- [ ] `pnpm dev` completo en paralelo (requiere `.env` y base de datos del backend).
- [ ] Visualización real en navegador del landing (animaciones WebGL/scroll).

**Pendiente de decisión:**
- [ ] `web-catalogo` (app pública) contiene un panel administrativo completo (`/admin/*`, `/login`,
      `/register`) duplicado respecto a `web-admin`, contrario a la separación de ADR-001.

---

## Faltantes respecto al SRS — desarrollo (2026-09-15)

Auditoría del código contra el SRS v1.2 (todos los RF, RNF, ADRs y el DoD). Lo implementado y
verificado en esta ronda:

**Backend — contratos y RF que faltaban:**
- [x] **Refresh token con rotación** (SRS §5): modelo `RefreshToken` (solo hash SHA-256, familias,
      detección de reuso con revocación de familia), `RefreshTokenService`, endpoints
      `POST /api/auth/refresh` y `POST /api/auth/logout`. Login y registro ahora devuelven
      `refreshToken`. Migración `20260915000000_refresh_token_rotacion` generada offline. 6 tests.
- [x] **`POST /api/sync/batch`** (RF-007 / ADR-004): procesa operaciones offline por-operación
      (nunca todo-o-nada, FA-02), idempotente (reenviar el mismo lote no duplica), con permiso por
      tipo validado por operación. Cota de 100 operaciones (§5). 4 tests.
- [x] **RF-003 corrección referenciada + AJUSTE bidireccional**: `movimientoReferenciaId` en el DTO
      y persistido (el ledger es inmutable, se corrige con un movimiento nuevo que referencia al
      original); AJUSTE ahora puede incrementar (sobrante en conteo) o decrementar (faltante).
- [x] **RF-008 cambio de talla**: `POST /api/inventario/cambio-talla` crea DEVOLUCION + SALIDA
      ligadas y atómicas en una transacción (nunca medio cambio aplicado). 4 tests.
- [x] **Health checks independientes** (ADR-001): `GET /health` (liveness) y `GET /health/ready`
      (readiness con `SELECT 1`).
- [x] **413 en subida** (RF-009 FA-02): `MulterExceptionFilter` mapea `LIMIT_FILE_SIZE` a 413.
- [x] **Logging de seguridad** (§5): filtro global que registra 401/403/429/5xx en JSON
      estructurado (sin password/token/payload) sin alterar el formato de respuesta.
- [x] **Test de contrato público bloqueante** (R-004 / DoD): recorre la respuesta de `/public/*` y
      falla si aparece costo/margen/proveedor/stock exacto. 3 tests.

**Frontend:**
- [x] `web-admin`: `authedFetch` centraliza las llamadas y renueva el token de forma transparente
      ante un 401 (rotación serializada). Login/registro guardan el refresh token; logout lo revoca
      en el servidor.

**Tooling / infra (Fase 6 y DoD):**
- [x] **Pipeline CI** (`.github/workflows/ci.yml`): gates de build+typecheck+lint+tests,
      cobertura, `pnpm audit`, OSV, gitleaks y Semgrep. Corre solo en CI (no ve el `.env` local).
- [x] **Umbrales de cobertura**: lógica de inventario a 88% (objetivo DoD ≥70%); auth, refresh,
      guards y storage con gate propio; piso global anti-regresión.
- [x] **Empaquetado Docker** (ADR-005): Dockerfiles multi-stage (backend + los dos Next en
      standalone), `docker-compose.yml` (Postgres + 3 servicios), `.env.docker.example`,
      `.dockerignore`. `next build` local en Windows queda limpio (standalone solo en Docker/Linux).
- [x] **Parche de seguridad de dependencias**: de 23 advisories (2 críticas RCE de Next) a
      `pnpm audit` limpio, vía bump de Next y `overrides` en `pnpm-workspace.yaml`.

**Estado de verificación:** 93 tests backend en verde (9 suites); `tsc --noEmit` limpio en los 4
paquetes; build de producción OK en backend, web-catalogo (16 rutas) y web-admin; `pnpm audit` sin
vulnerabilidades.

**Faltantes que NO se abordaron (fuera del alcance de esta ronda o requieren decisión):**
- [ ] **App móvil React Native/Expo** (RF-007 completo, Fase 4): no existe. El backend ya expone
      `/api/sync/batch` que consumiría. Es un desarrollo aparte, no un ajuste.
- [ ] **UI de gestión de usuarios en web-admin** (RF-006): el backend (`/api/usuarios`) existe y
      está protegido, pero no hay pantalla. Falta también la UI de devolución/cambio de talla.
- [ ] **Cobertura del "resto del backend" a ≥50%** (DoD): controladores y servicios CRUD
      (categorias, ubicaciones, productos, usuarios parcial) sin tests unitarios. El piso global
      actual (~18%) es anti-regresión, no el objetivo.
- [ ] **Verificación en runtime de CI y Docker**: no se ejecutaron aquí (sin Docker en el entorno;
      el trace standalone de Next requiere Linux). Config validada estáticamente.
- [ ] **`web-catalogo` con panel admin duplicado** (`/admin/*`, `/login`, `/register`): contradice
      ADR-001; su auth no se conectó al refresh token. Pendiente de decisión (eliminar vs mantener).
- [ ] **`@core/api-client`**: ninguna app lo importa aún; tipos no generados desde OpenAPI (ADR-007).
- [ ] **Verificación dinámica de seguridad** (sqlmap `--level 3`, pruebas de carga p95): requieren
      staging con el protocolo del gate de herramientas.
