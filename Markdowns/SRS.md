# SRS — Sistema de Catálogo Virtual + Gestor de Inventario para Tiendas de Ropa
**Versión:** 1.0
**Fecha:** 2026-08-18
**Autor:** Usuario | **Revisor técnico:** Arch-Sentinel
**Estado:** Aprobado — sin pendientes bloqueantes (v1.2)

**Nombre comercial del producto:** Tienda360 (nombre de trabajo / placeholder — sin decisión de branding final; usar consistentemente en código, dominios de desarrollo y documentación hasta que se reemplace)

---

## Nota de lectura de seguridad

Los controles de seguridad de este SRS están distribuidos en varias secciones. Mapa de referencia rápida:
- Modelo de amenazas y activos: Sección 7
- Reglas de headers HTTP como input no confiable, CSP, logging: Sección 5 → Seguridad
- RBAC y separación de contratos público/interno: Sección 6.3 (ADR-001) y 6.5
- Idempotencia de sincronización offline: Sección 6.5 y 9B
- Checklist de verificación pre-producción: Sección 9 → DoD

---

## 1. Resumen ejecutivo

Producto de software compuesto por dos módulos sobre un backend compartido, ofrecido como **instalación dedicada por cliente** (infraestructura propia por tienda, no SaaS multi-tenant): (1) un **catálogo virtual web** de solo vitrina, sin checkout, con contacto por WhatsApp; y (2) un **gestor de inventario** web y móvil que registra movimientos de stock (entradas, salidas, ajustes, traslados, devoluciones) por variante de producto (SKU) y por ubicación. No incluye punto de venta ni facturación electrónica en esta fase — la venta y la factura se gestionan fuera del sistema.

El problema de negocio que resuelve: tiendas de ropa que hoy llevan inventario en hojas de cálculo o cuadernos, sin trazabilidad de quién movió qué stock, sin catálogo digital presentable, y sin visibilidad de disponibilidad por talla/color en tiempo real entre bodega y tienda.

Impacto esperado: reducción de sobreventa y descuadre de inventario, trazabilidad de movimientos con autoría, y presencia digital de catálogo sin depender de redes sociales como única vitrina.

## 2. Stakeholders y usuarios

| Rol | Necesidad principal | Criterio de éxito |
|-----|--------------------|--------------------|
| Dueño/administrador de tienda | Ver stock consolidado, controlar acceso de empleados, ver quién movió qué | Cero ajustes de stock sin autor identificable |
| Vendedor (piso de venta) | Consultar disponibilidad de talla/color rápido, registrar salida por venta | Consulta de stock en menos de 3 seg |
| Personal de bodega | Registrar entradas, traslados entre ubicaciones, conteos físicos | Puede operar sin conexión a internet en bodega |
| Cliente final (público) | Ver catálogo, tallas disponibles, contactar por WhatsApp | Encuentra el producto y contacta sin fricción |
| Vendor/operador técnico (equipo de 2-3 devs) | Instalar, actualizar y dar soporte a N instalaciones sin que cada una sea un caso especial | Despliegue reproducible por IaC, no manual |

## 3. Alcance

**En scope:**
- Catálogo web público (vitrina): listado, filtros por categoría/talla/color, ficha de producto, botón de contacto WhatsApp (deep link `wa.me`, sin integración de API de pago ni mensajería)
- Gestor de inventario web (administración completa) y móvil (operación en piso/bodega, con soporte offline)
- Modelo de producto por variante (SKU): talla, color, y atributo adicional configurable
- Registro de movimientos de inventario con autoría y ubicación (ledger, no columna mutable)
- Gestión de ubicaciones (múltiples: bodega + tienda(s) del mismo cliente)
- Gestión de usuarios y roles (RBAC: admin, vendedor, bodega)
- Registro de devoluciones y cambios de talla como movimiento de inventario con motivo
- Carga y gestión de imágenes de producto
- Sincronización offline-first desde la app móvil, idempotente
- Despliegue dedicado por cliente vía infraestructura como código (reproducible, no manual)

**Fuera de scope (explícito):**
- Punto de venta (POS) y facturación electrónica DIAN — la venta se registra fuera del sistema; el gestor de inventario solo refleja el efecto en stock cuando alguien registra el movimiento correspondiente
- Checkout / pago online en el catálogo — el contacto es por WhatsApp, sin procesamiento de pagos
- Multi-tenancy a nivel de infraestructura — cada cliente tiene su propia instancia, no hay aislamiento lógico de tenant en la misma base de datos
- Integración con proveedores externos de logística o ERPs de terceros
- Analítica avanzada / BI — se deja para fase posterior
- Notificaciones push nativas — confirmado fuera de esta fase; no se diseña modelo de datos para esto todavía. Evaluar como fase 2 explícita si aparece demanda real (ej. alertas de stock bajo)

## 4. Requisitos funcionales

### RF-001: Gestión de catálogo de productos
- **Descripción:** El administrador crea y edita productos con sus variantes (SKU por talla/color), asigna categoría, precio, imágenes, y define si el producto es visible en el catálogo público.
- **Actores:** Administrador
- **Precondiciones:** Usuario autenticado con rol admin
- **Flujo principal:**
  1. Admin crea producto base (nombre, descripción, categoría)
  2. Admin agrega una o más variantes (talla, color) — cada variante genera un SKU único
  3. Admin asigna precio vigente y sube imágenes
  4. Admin marca el producto como visible/no visible en catálogo público
  5. Sistema persiste y el catálogo público refleja el cambio
- **Flujos alternativos:**
  - FA-01: Usuario no autenticado → 401 con schema de error estándar
  - FA-02: SKU duplicado (misma combinación talla/color en el mismo producto) → 409 con mensaje explícito
  - FA-03: Falta campo obligatorio → 400 con `field` identificando cuál
- **Postcondiciones:** Producto y variantes persistidos; visible en catálogo público si corresponde
- **Criterios de aceptación:** Un producto con 3 variantes de talla genera 3 SKU distintos, cada uno con stock independiente

### RF-002: Consulta pública de catálogo
- **Descripción:** Cualquier visitante puede ver el catálogo sin autenticarse, filtrar por categoría/talla, ver ficha de producto con tallas disponibles, y contactar por WhatsApp.
- **Actores:** Público (no autenticado)
- **Precondiciones:** Ninguna
- **Flujo principal:**
  1. Visitante accede al catálogo
  2. Sistema muestra productos visibles con imagen, nombre, precio, tallas con stock > 0
  3. Visitante filtra por categoría/talla
  4. Visitante abre ficha de producto
  5. Visitante presiona "Contactar por WhatsApp" → deep link `wa.me` con mensaje prellenado (nombre de producto/SKU)
- **Flujos alternativos:**
  - FA-01: Talla sin stock → se muestra como agotada, no seleccionable
  - FA-02: Producto sin imágenes → se muestra placeholder, nunca error
- **Postcondiciones:** Ninguna persistencia — es solo lectura
- **Criterios de aceptación:** El endpoint público **nunca** retorna costo, margen, proveedor ni cantidad exacta de stock — solo disponible/agotado (ver ADR-001 y sección 6.5)

### RF-003: Registro de movimientos de inventario
- **Descripción:** El personal autorizado registra entradas, salidas, ajustes y traslados de stock por SKU y ubicación.
- **Actores:** Bodega, Vendedor (según tipo de movimiento), Admin
- **Precondiciones:** Usuario autenticado con permiso sobre el tipo de movimiento
- **Flujo principal:**
  1. Usuario selecciona SKU y ubicación
  2. Usuario selecciona tipo de movimiento: entrada / salida / ajuste / traslado / devolución
  3. Usuario ingresa cantidad y motivo (obligatorio en ajustes y devoluciones)
  4. Sistema valida stock suficiente si es salida o traslado
  5. Sistema persiste el movimiento en el ledger con autor, timestamp, ubicación origen/destino
  6. Sistema recalcula saldo derivado del SKU en esa ubicación
- **Flujos alternativos:**
  - FA-01: Stock insuficiente para salida/traslado → 422 con `reason: "insufficient_stock"`
  - FA-02: Petición duplicada (mismo Idempotency-Key) → retorna el resultado ya procesado, no re-ejecuta (ver sección 6.5)
  - FA-03: Ubicación destino inválida en traslado → 400
- **Postcondiciones:** Movimiento persistido de forma inmutable; saldo actualizado
- **Criterios de aceptación:** Ningún movimiento se puede editar ni borrar — una corrección se hace con un movimiento de ajuste nuevo que referencia al original

### RF-004: Consulta de stock por SKU y ubicación
- **Descripción:** Cualquier usuario autenticado consulta el saldo actual de un SKU, desglosado por ubicación.
- **Actores:** Todos los roles autenticados
- **Flujo principal:** Usuario busca por SKU o nombre de producto → sistema retorna saldo por ubicación y saldo total
- **Criterios de aceptación:** Latencia p95 < 500ms (ver sección 5, Rendimiento)

### RF-005: Gestión de ubicaciones
- **Descripción:** El admin define las ubicaciones físicas del cliente (típicamente bodega + una o más tiendas).
- **Actores:** Admin
- **Criterios de aceptación:** El sistema soporta 1 a N ubicaciones desde el primer despliegue, aunque el cliente inicie con una sola

### RF-006: Gestión de usuarios y roles (RBAC)
- **Descripción:** El admin crea usuarios y les asigna rol (admin, vendedor, bodega). El rol determina qué puede ver y qué movimientos puede registrar.
- **Actores:** Admin
- **Flujos alternativos:**
  - FA-01: Vendedor intenta ver costo/margen → 403
  - FA-02: Bodega intenta registrar salida por venta → 403 (fuera de su scope de rol)
- **Criterios de aceptación:** Matriz de permisos verificable — ningún endpoint depende de un flag oculto en el frontend para ocultar datos

**Matriz de permisos por rol (definitiva):**

| Acción | Admin | Vendedor | Bodega |
|---|---|---|---|
| Ver costo / margen / proveedor | ✅ | ❌ | ❌ |
| Consultar stock (sin costo) | ✅ | ✅ | ✅ |
| Registrar entrada | ✅ | ❌ | ✅ |
| Registrar salida | ✅ | ✅ | ❌ |
| Registrar ajuste | ✅ | ❌ | ✅ |
| Registrar traslado | ✅ | ❌ | ✅ |
| Registrar devolución/cambio de talla | ✅ | ✅ | ❌ |
| Gestión de catálogo (crear/editar producto) | ✅ | ❌ | ❌ |
| Gestión de usuarios | ✅ | ❌ | ❌ |

### RF-007: Sincronización offline desde app móvil
- **Descripción:** La app móvil de bodega/vendedor funciona sin conexión, encola operaciones localmente, y sincroniza cuando hay red.
- **Actores:** Bodega, Vendedor (desde app móvil)
- **Flujo principal:**
  1. Usuario registra movimiento sin conexión
  2. App genera Idempotency-Key local (UUID v4) y encola la operación
  3. Al recuperar conexión, app envía el lote a `/api/sync/batch`
  4. Backend procesa cada operación de forma idempotente
  5. App marca como sincronizado y limpia la cola local
- **Flujos alternativos:**
  - FA-01: Conflicto (mismo SKU modificado por dos usuarios distintos sin conexión) → se procesa en orden de timestamp de servidor, nunca de cliente; se notifica al usuario si su operación resultó en stock negativo por conflicto
  - FA-02: Batch parcialmente fallido → cada operación del batch se procesa y reporta individualmente, no es todo-o-nada
- **Postcondiciones:** Ninguna operación se pierde ni se duplica
- **Criterios de aceptación:** Enviar el mismo batch dos veces produce el mismo estado final (ver sección 9B, verificación de idempotencia)

### RF-008: Registro de devoluciones y cambios de talla
- **Descripción:** El vendedor registra una devolución o cambio de talla como movimiento de inventario con motivo explícito.
- **Actores:** Vendedor, Admin
- **Criterios de aceptación:** Un cambio de talla se modela como dos movimientos ligados (salida de la talla devuelta + entrada de la talla nueva), nunca como edición directa de saldo

### RF-009: Gestión de imágenes de producto
- **Descripción:** El admin sube imágenes de producto a almacenamiento de objetos.
- **Actores:** Admin
- **Flujos alternativos:**
  - FA-01: Archivo no es imagen válida (validación de tipo MIME real, no por extensión) → 400
  - FA-02: Archivo excede tamaño máximo → 413
- **Criterios de aceptación:** Ningún archivo subido se sirve desde el mismo dominio del backend sin sanitización de nombre y sin content-type forzado (ver sección 7, mitigación de subida de archivos)

## 5. Requisitos no funcionales

### Rendimiento
- Latencia p95 < 300ms para catálogo público (con cache)
- Latencia p95 < 500ms para operaciones de inventario (API interna)
- Sincronización de un batch offline de hasta 100 operaciones: < 5s

### Disponibilidad
- SLA objetivo: **parámetro de onboarding por instalación**, no un valor global fijo — se define en el contrato comercial de cada cliente. Default de diseño técnico si el cliente no especifica: 99% (negocio pequeño-mediano, no crítico 24/7). El equipo comercial es responsable de capturar este dato antes de cerrar la Fase de build 6 (empaquetado de despliegue) de esa instalación específica.
- RTO: 4 horas
- RPO: 24 horas (backup diario de base de datos por instalación)

### Seguridad
- **Autenticación:** JWT, algoritmo RS256, access token de vida corta (15-30 min), refresh token con rotación
- **Autorización:** RBAC (admin / vendedor / bodega), verificado en cada endpoint del backend, nunca solo en el frontend
- **Datos sensibles identificados:** costo y margen de producto, datos de proveedor, datos de empleados (usuarios del sistema)
- **Compliance:** Ley 1581 de 2012 (Habeas Data, Colombia) — aplica a datos de usuarios/empleados del sistema. Sin checkout no hay datos de pago que proteger. [PENDIENTE: si en el futuro se captura nombre/teléfono de clientes para el contacto de WhatsApp dentro del sistema (no solo el deep link), se debe agregar registro de tratamiento de datos y aviso de privacidad]
- **Auditoría:** todo movimiento de inventario queda registrado con autor, timestamp y ubicación (inmutable)

#### Headers HTTP como input no confiable (obligatorio, no negociable)
Todo header HTTP (`User-Agent`, `Referer`, `X-Forwarded-For`, `X-Real-IP`, `Host`, `Cookie`, `Accept-Language`, headers custom) se trata como input no confiable:
- Ningún header se concatena en queries SQL, comandos de sistema, paths de archivo o templates
- Toda escritura a base de datos derivada de un header (incluido logging/analytics de requests) usa prepared statements, sin excepción
- `X-Forwarded-For` se lee únicamente del proxy/load balancer configurado, nunca se confía en el valor si viene directo del cliente sin proxy intermedio
- `Host` se valida contra allowlist del dominio configurado por instalación
- Un audit de SQLi sobre los endpoints públicos del catálogo no se considera cerrado sin cubrir el vector de headers (`sqlmap --level 3` o superior sobre parámetros y headers)

#### Política de logging de seguridad
Eventos que siempre se registran (JSON estructurado, timestamp ISO 8601, nivel info/warn/error):
- Autenticaciones exitosas y fallidas (IP, timestamp — sin password ni token)
- Bloqueos por rate limiting (IP, timestamp, endpoint)
- Todo movimiento de inventario (ya cubierto por el ledger de RF-003, que es en sí mismo el log de auditoría de negocio)
- Errores 5xx (endpoint, mensaje interno, sin datos sensibles de usuario)
- Intentos de autorización fallidos 401/403 (endpoint, IP, usuario si está identificado)

Eventos que nunca se registran: passwords, tokens, secrets, payloads completos con datos sensibles.

#### CSP para el catálogo web público
```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' res.cloudinary.com;
  connect-src 'self' [DOMINIO_API_BACKEND — se resuelve por instalación en el script de IaC];
  script-src 'self';
  style-src 'self';
  frame-ancestors 'none';
```

#### Otros headers de seguridad obligatorios (producción)
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- CORS: allowlist explícita del dominio del catálogo público, nunca wildcard
- Cookies (si se usan para sesión web admin): `Secure` + `HttpOnly` + `SameSite=Strict`

### Escalabilidad
- Escala vertical por instalación (no se proyecta necesidad de escala horizontal dado el tamaño de cliente objetivo)
- Volumen de datos proyectado a 12 meses por instalación: **parámetro de onboarding**, se releva con cada cliente antes del despliegue (no hay un valor único para todas las instalaciones). Supuesto de desarrollo/testing por defecto, sin valor contractual: ~500-1000 SKU y ~2000 movimientos/mes — solo para dimensionar el entorno de pruebas, no el sizing real de producción de cada cliente.
- Cache de catálogo público (CDN o cache de aplicación) para absorber picos de tráfico sin afectar el módulo de inventario

### Mantenibilidad
- Cobertura de tests mínima: 70% en lógica de negocio de inventario (ledger, cálculo de saldo, idempotencia); 50% en resto del backend
- Documentación de API: OpenAPI 3.x generado desde el código, no mantenido a mano
- Proceso de deploy: pipeline CI/CD + infraestructura como código por instalación (ver sección 9B)

## 6. Arquitectura del sistema

### 6.1 Diagrama de contexto (C4 Nivel 1)
El sistema es una instalación dedicada por cliente. Actores externos: **Visitante público** (consume catálogo web), **Personal de la tienda** (admin/vendedor/bodega, consume web admin y app móvil), **WhatsApp** (solo como deep link saliente, no hay integración de API — sin dependencia de credenciales ni webhook). No hay sistemas externos de pago ni facturación en esta fase.

### 6.2 Diagrama de contenedores (C4 Nivel 2)
- **Web Catálogo (público):** Next.js (SSR/SSG), consume `/public/*` del backend, servido detrás de CDN/cache
- **Web Admin (inventario):** Next.js, consume `/api/*` autenticado — mismo framework que el catálogo (ver ADR-007), UI de escritorio (tablas, formularios densos)
- **App Móvil (inventario):** React Native + Expo, con base local (Expo SQLite) para operación offline, sincroniza contra `/api/sync/batch` — UI optimizada para uso rápido en piso/bodega, distinta de la web admin por diseño
- **Backend API (monolito modular, NestJS):** módulos de dominio — `catalogo`, `inventario`, `identidad` — expone dos superficies de contrato (`/public/*` y `/api/*`) desde el mismo proceso
- **Paquete compartido (`@core/api-client`):** tipos TypeScript generados desde OpenAPI + lógica de negocio idéntica en web admin y móvil (generación de Idempotency-Key, validación de payload de movimiento) — ver ADR-007
- **Base de datos:** PostgreSQL (única por instalación)
- **Almacenamiento de imágenes:** Supabase Storage (ver ADR-008, revisado 2026-09-02) — buckets privados con URLs firmadas, allowlist de tipo MIME real y de bucket destino en el backend

### 6.3 Decisiones de arquitectura (ADRs)

#### ADR-001: Monolito modular con contratos API separados por rol
- **Estado:** Aceptado
- **Contexto:** Equipo de 2-3 devs operando N instalaciones dedicadas. La alternativa de microservicios o de servicios físicamente separados multiplica el costo operativo por cada cliente.
- **Decisión:** Un solo backend desplegable, organizado en módulos de dominio, con dos superficies de API (`/public/*` de solo lectura sin datos sensibles, `/api/*` autenticada con RBAC) implementadas con DTOs/serializers explícitos por endpoint — nunca el mismo objeto de dominio serializado condicionalmente por rol.
- **Consecuencias:** Menor costo operativo por instalación; riesgo de que un bug en el módulo de catálogo afecte disponibilidad del módulo de inventario, mitigado con manejo de errores aislado por módulo y health checks independientes.
- **Alternativas descartadas:** Separación física de servicios (mayor blast-radius isolation pero duplica unidades de deployment por cliente — no justificado al tamaño de equipo); microservicios granulares (sobre-ingeniería para este dominio y equipo).
- **Fitness function de migración:** si el tráfico del catálogo público de alguna instalación degrada p95 del módulo de inventario de forma sostenida, ese es el trigger documentado para separar en Opción 2 (ver discusión de Fase 3) — no antes.

#### ADR-002: Modelo de datos por variante (SKU), no por producto plano
- **Estado:** Aceptado
- **Contexto:** En retail de ropa el stock vive en la combinación talla/color, no en el producto genérico.
- **Decisión:** Toda unidad de stock es un SKU (producto + talla + color + atributos opcionales). El producto es un agrupador de presentación, nunca la unidad de inventario.
- **Consecuencias:** Modelo correcto desde el día 1; evita migración destructiva cuando el negocio crece.
- **Alternativas descartadas:** Producto con campo `stock` plano — descartada por ser el error estructural más común y costoso del dominio.

#### ADR-003: Ledger de movimientos de inventario, no columna de stock mutable
- **Estado:** Aceptado
- **Contexto:** Un `UPDATE stock = stock - 1` bajo concurrencia (app móvil + web admin simultáneos) genera condiciones de carrera y sobreventa; además no da trazabilidad de autoría.
- **Decisión:** El stock es un saldo derivado de una tabla de movimientos append-only (`entrada`, `salida`, `ajuste`, `traslado`, `devolución`), cada uno con autor, timestamp y ubicación. El saldo se calcula o se materializa con actualización transaccional atómica al insertar el movimiento.
- **Consecuencias:** Auditoría de negocio y control antifraude interno vienen gratis con el modelo; ligeramente más complejo de consultar que una columna simple, mitigado con saldo materializado.
- **Alternativas descartadas:** Columna de stock con lock optimista — insuficiente para dar trazabilidad de autoría, que es un requisito explícito del negocio (control de ajustes manuales).

#### ADR-004: Offline-first en app móvil con idempotencia obligatoria
- **Estado:** Aceptado
- **Contexto:** La app se usa en bodega y probadores donde la conectividad no está garantizada.
- **Decisión:** Toda operación de la app móvil se encola localmente con un Idempotency-Key generado por el cliente (UUID v4) y se sincroniza en batch. El backend deduplica por esa key.
- **Consecuencias:** Un retry de red por mala señal no duplica movimientos de stock.
- **Alternativas descartadas:** Sincronización sin control de idempotencia — descartada, es la causa más común de descuadre de inventario en sistemas offline-first mal diseñados.

#### ADR-005: Despliegue dedicado por cliente vía infraestructura como código
- **Estado:** Aceptado
- **Contexto:** Instalación dedicada por cliente fue decisión explícita del usuario (no SaaS multi-tenant).
- **Decisión:** Cada instalación se despliega vía scripts de IaC reproducibles (Docker Compose + script de provisión, o Ansible), nunca configuración manual servidor por servidor.
- **Consecuencias:** Con 2-3 devs y N instalaciones, esto es lo único que hace sostenible el modelo de negocio a mediano plazo. El costo de no hacerlo es acumulativo y no se nota hasta el cliente ~10.
- **Alternativas descartadas:** Instalación manual por cliente — descartada explícitamente, es deuda técnica organizacional garantizada.

#### ADR-006: Facturación electrónica DIAN y POS fuera de alcance de esta fase
- **Estado:** Aceptado (decisión de scope, no omisión)
- **Contexto:** El usuario confirmó que el gestor de inventario solo controla movimientos de stock; la venta y factura se gestionan fuera del sistema.
- **Decisión:** No se integra DIAN ni se modela transacción de venta en esta fase.
- **Consecuencias:** Si en una fase futura el sistema pasa a registrar la venta, esto requiere un SRS de extensión propio — no es un "agregado menor", implica modelo de datos de transacción, numeración legal, y flujo de facturación electrónica completo.
- **Riesgo documentado:** si algún cliente empieza a usar el módulo de "salida por venta" como sustituto informal de una factura, eso es uso indebido del sistema fuera de su diseño — debe advertirse explícitamente en la capacitación al cliente.

#### ADR-007: Monorepo con Next.js para ambas webs, React Native/Expo para móvil, paquete compartido de tipos y lógica
- **Estado:** Aceptado
- **Contexto:** El gestor de inventario opera en dos superficies con UX distinta — web admin (escritorio, tablas densas) y app móvil (bodega/piso, offline-first). Forzar un único framework de UI para ambas agregaría más complejidad que la que ahorra.
- **Decisión:** Web catálogo y web admin comparten Next.js (un solo stack de frontend web para el equipo). La app móvil usa React Native + Expo, stack aparte por naturaleza de la plataforma. Las tres viven en un monorepo (pnpm workspaces + Turborepo) con un paquete compartido `@core/api-client`: tipos generados desde el OpenAPI del backend y lógica de negocio que debe ser idéntica en los dos frontends autenticados (generación de Idempotency-Key, validación de payload de movimiento antes de encolar).
- **Consecuencias:** Un cambio de contrato de API rompe el build de los dos frontends al mismo tiempo en CI, en vez de descubrirse en producción en uno de los dos. Configuración de monorepo agrega complejidad inicial de tooling, aceptada a cambio de esa garantía.
- **Alternativas descartadas:** Un solo framework "universal" (ej. intentar reusar componentes web en RN vía librerías cross-platform) — descartado porque las dos superficies tienen necesidades de UX genuinamente distintas; forzar reuso de UI ahí sí sería complejidad especulativa (viola Principio de código #6 de copilot-instructions.md).

#### ADR-008: Supabase Storage como storage de imágenes y videos de producto (revisado 2026-09-02)
- **Estado:** Aceptado — revisa la decisión original de este ADR (Cloudinary), documentada abajo en la sección "Decisión original" por trazabilidad.
- **Contexto:** La auditoría de seguridad y funcionalidad del 2026-09-02 encontró que el código del backend (`StorageService`) nunca implementó Cloudinary: implementa Supabase Storage desde el inicio de este módulo. El SRS no se había actualizado para reflejarlo. Se revisó con el usuario si migrar el código a Cloudinary para cumplir el SRS original, o actualizar el SRS para reflejar Supabase — se optó por lo segundo, dado que Supabase Storage ya está en producción, ya fue auditado y corregido (ver hallazgos SEC-06 y SEC-07 de esa auditoría: allowlist de MIME real, extensión derivada del MIME y no del nombre de archivo del cliente, carpeta de destino saneada contra path traversal, `upsert:false`, y allowlist del bucket destino en el borrado), y fue verificado en runtime contra el proyecto Supabase real de esta instalación.
- **Decisión:** Supabase Storage con dos buckets privados (`products_images`, `products_videos`) y URLs firmadas de corta vigencia (7 días), en vez de Cloudinary. El backend valida el tipo MIME real contra una allowlist antes de aceptar cualquier archivo; la transformación de imagen (resize, formato) queda fuera de alcance por ahora — a diferencia de Cloudinary, Supabase Storage no ofrece transformación por parámetro de URL en el plan usado por esta instalación.
- **Consecuencias:** Se pierde la transformación de imagen gestionada que ofrecía Cloudinary (ADR original); si el volumen de imágenes o la necesidad de variantes de tamaño crece, esto requiere una pipeline propia (p. ej. `sharp` en el backend) o una migración a un CDN con transformación por URL. A cambio, se consolida el almacenamiento de datos (Postgres) y de archivos (Storage) en un solo proveedor (Supabase), reduciendo el número de servicios externos a administrar por instalación.
- **Alternativas descartadas:** Migrar el código existente a Cloudinary para que coincidiera con el SRS original — descartada porque habría significado reescribir un módulo ya probado y corregido, sin un beneficio funcional claro para el tamaño de negocio objetivo, solo para hacer coincidir el documento con una decisión que en la práctica nunca se implementó.

<details>
<summary>Decisión original (2026-08-18), reemplazada por la de arriba</summary>

- **Estado:** Reemplazado.
- **Contexto:** Negocio con poco personal técnico operando el catálogo día a día, pero con volumen de imágenes alto (múltiples fotos por SKU × talla/color).
- **Decisión:** Cloudinary en vez de S3/MinIO crudo. Transformación de imagen (resize, formato, compresión) por parámetro de URL, sin pipeline propia de procesamiento en el backend.
- **Consecuencias:** Elimina código de generación de thumbnails y optimización que habría que mantener en N instalaciones. Costo por GB mayor que S3 puro a partir de cierto volumen — irrelevante al tamaño de negocio objetivo.
- **Alternativas descartadas:** S3/MinIO + pipeline propia de resize — descartada por costo de mantenimiento operativo con equipo de 2-3 devs sobre N instalaciones. Migración a S3+CDN propio queda como salida documentada si algún cliente individual crece lo suficiente para justificarlo.

</details>

### 6.4 Modelo de datos (entidades principales)

- **Ubicacion**: id, nombre, tipo (bodega/tienda), dirección
- **Usuario**: id, nombre, email, password_hash, rol (admin/vendedor/bodega), activo
- **Categoria**: id, nombre, categoría_padre (opcional, para subcategorías)
- **Producto**: id, nombre, descripción, categoria_id, visible_publico (bool)
- **Variante (SKU)**: id, producto_id, talla, color, atributo_opcional, sku_code (único)
- **PrecioHistorico**: id, variante_id, precio, vigente_desde, vigente_hasta (nullable = vigente actual)
- **ImagenProducto**: id, producto_id, url_storage, orden
- **MovimientoInventario**: id, variante_id, ubicacion_id, ubicacion_destino_id (nullable, solo traslados), tipo (entrada/salida/ajuste/traslado/devolucion), cantidad, motivo (obligatorio en ajuste/devolución), usuario_id, timestamp, idempotency_key (único), movimiento_referencia_id (nullable, para ajustes que corrigen otro movimiento)
- **SaldoInventario** (materializado): variante_id, ubicacion_id, cantidad — derivado y recalculado transaccionalmente desde MovimientoInventario, nunca editado directamente

Relaciones clave: `Producto 1—N Variante`, `Variante 1—N MovimientoInventario`, `Variante 1—N PrecioHistorico`, `Variante+Ubicacion → SaldoInventario` (clave compuesta).

### 6.5 Contratos de API (endpoints críticos)

**`GET /public/catalogo`**
- Request: query params `categoria`, `talla`, `page`
- Response 200: `[{ producto_id, nombre, precio_actual, imagen_principal, variantes: [{ talla, color, disponible: bool }] }]`
- **Nunca incluye:** costo, margen, proveedor, cantidad exacta de stock
- Errores: 400 si paginación inválida

**`GET /public/productos/:id`**
- Response 200: ficha completa pública (igual restricción de campos que arriba) + `whatsapp_link` generado server-side con mensaje prellenado
- Errores: 404 si no existe o no es visible

**`POST /api/inventario/movimientos`**
- Headers: `Authorization: Bearer <JWT>`, `Idempotency-Key: <UUID v4>` (obligatorio)
- Request: `{ variante_id, ubicacion_id, ubicacion_destino_id?, tipo, cantidad, motivo? }`
- Response 201: movimiento creado + saldo actualizado
- Errores: 400 (validación), 401, 403 (rol no autorizado para este tipo de movimiento), 409 (idempotency key con payload distinto), 422 (`insufficient_stock`)

**`GET /api/inventario/stock`**
- Query: `sku` o `variante_id`
- Response 200: `[{ ubicacion_id, cantidad }]` + `total`
- Requiere autenticación — este dato nunca es público

**`POST /api/sync/batch`**
- Request: `{ operaciones: [{ idempotency_key, tipo, payload }] }`
- Response 200: `{ resultados: [{ idempotency_key, status: "processed"|"duplicate"|"error", detalle }] }` — por operación, nunca todo-o-nada
- Errores: 401

**`POST /api/auth/login`**
- Request: `{ email, password }`
- Response 200: `{ access_token, refresh_token }`
- Rate limiting agresivo: bloqueo progresivo por IP y por cuenta
- Respuesta idéntica para "usuario no existe" y "password incorrecta" (previene enumeración)

## 7. Threat Model

### Activos a proteger

| Activo | Sensibilidad | Consecuencia si comprometido |
|--------|-------------|------------------------------|
| Costo y margen de producto | Alta | Ventaja competitiva expuesta a competidores o público |
| Ledger de movimientos de inventario | Alta | Pérdida de trazabilidad = robo interno indetectable |
| Credenciales de usuarios del sistema | Alta | Acceso no autorizado a inventario y datos de negocio |
| Imágenes de producto / storage | Media | Costo de almacenamiento abusado, posible vector de malware si no se valida tipo de archivo |
| Datos de contacto del catálogo público | Baja | Sin PII de pago; bajo impacto pero sujeto a Ley 1581 igual |

### Amenazas identificadas (STRIDE)

| ID | Amenaza | Categoría STRIDE | Probabilidad | Impacto | Mitigación |
|----|---------|-----------------|-------------|---------|------------|
| T-001 | Vendedor consulta costo/margen vía endpoint mal filtrado (BOLA/exceso de exposición de datos) | Information Disclosure | Media | Alto | DTOs explícitos por endpoint (ADR-001); tests de contrato que verifican campos ausentes en `/public/*` |
| T-002 | Ajuste de stock sin autor real (empleado cubre faltante manualmente) | Repudiation | Media | Alto | Ledger inmutable con autor obligatorio (ADR-003); ajustes requieren motivo |
| T-003 | Replay de operación de sync offline duplica movimiento de stock | Tampering | Media | Medio | Idempotency-Key obligatoria, deduplicación server-side (ADR-004) |
| T-004 | Subida de archivo malicioso disfrazado de imagen (polyglot) | Tampering / Elevation of Privilege | Baja | Alto | Validación de tipo MIME real (no extensión), storage separado del dominio de la app, sin ejecución de contenido subido |
| T-005 | Fuerza bruta / credential stuffing sobre login | Spoofing | Media | Alto | Rate limiting progresivo por IP y cuenta, respuesta uniforme ante credenciales inválidas |
| T-006 | SQLi vía header HTTP mal manejado en logging o filtros | Tampering | Baja | Alto | Prepared statements en toda escritura derivada de headers, sin excepción (ver Sección 5) |
| T-007 | Scraping masivo del catálogo público (extracción de todo el inventario/precio por bots) | Information Disclosure | Media | Bajo-Medio | Rate limiting en `/public/*`, sin exponer cantidad exacta de stock |
| T-008 | Caída del módulo de catálogo por pico de tráfico afecta disponibilidad del módulo de inventario (comparten proceso) | Denial of Service | Baja | Medio | Cache/CDN delante del catálogo; monitoreo de p95 como fitness function de migración (ADR-001) |

### Controles implementados
- RBAC verificado en backend en cada endpoint de `/api/*` (nunca solo en frontend)
- DTOs/serializers explícitos por endpoint — no serialización condicional del mismo objeto de dominio
- Idempotency-Key obligatoria en operaciones de escritura desde app móvil
- Ledger inmutable de movimientos con autoría
- Rate limiting en login y en catálogo público
- Validación de tipo MIME real en carga de imágenes, storage aislado
- Prepared statements en toda escritura a base de datos, incluida la derivada de headers HTTP
- Headers de seguridad (CSP, HSTS, X-Content-Type-Options) en el catálogo web público

## 8. Dependencias externas

| Dependencia | Versión mínima | Propósito | Riesgo si no disponible |
|-------------|---------------|-----------|------------------------|
| PostgreSQL | 15+ | Base de datos transaccional | Sistema no operativo — es la única DB, sin fallback |
| Almacenamiento S3-compatible (MinIO o proveedor cloud) | — | Storage de imágenes | Catálogo funciona sin imágenes nuevas; imágenes existentes dependen de disponibilidad del storage |
| Node.js / runtime backend | LTS vigente | Ejecución del backend | Sistema no operativo |
| React Native + Expo (o equivalente) | — | App móvil | Sin app móvil, inventario solo operable desde web (sin modo offline) |
| Docker + herramienta de IaC (Ansible/Terraform) | — | Despliegue reproducible por instalación | Sin esto, cada instalación es manual y no reproducible (riesgo operativo, no técnico) |

## 9. Plan de testing (detección temprana)

### Pirámide de testing
- **Unit tests:** lógica de cálculo de saldo, validación de idempotencia, reglas de RBAC — cobertura 70% mínimo en estos módulos
- **Integration tests:** contrato de cada endpoint (incluye verificación explícita de que `/public/*` nunca serializa campos sensibles)
- **E2E tests:** flujo completo — crear producto → aparece en catálogo público → registrar movimiento de inventario → saldo se refleja → sincronización offline duplicada no duplica el movimiento
- **Security tests:** SAST en CI (Semgrep o equivalente), dependency scanning (npm audit / equivalente) bloqueante en CI para críticos/altos, secrets scanning (gitleaks) en cada commit, `sqlmap --level 3` sobre endpoints públicos incluyendo headers antes de cerrar cualquier auditoría de SQLi
- **Performance tests:** baseline de p95 de catálogo público y de `/api/inventario/stock` bajo carga simulada

### Criterios de Definición de Done (DoD)
- [ ] Tests pasan en CI
- [ ] Cobertura ≥ 70% en módulos de inventario, ≥ 50% en el resto
- [ ] No secrets en código (scanner automatizado)
- [ ] No vulnerabilidades críticas/altas en dependencias sin excepción documentada
- [ ] Linter sin errores
- [ ] Documentación de API (OpenAPI) actualizada
- [ ] Security review obligatorio en cualquier PR que toque autenticación, autorización, o el endpoint público del catálogo
- [ ] Verificación de idempotencia: enviar la misma operación de inventario dos veces produce un solo movimiento persistido
- [ ] Verificación de exposición de datos: test automatizado que falla si `/public/*` retorna campos de costo/margen/proveedor

## 9B. Build Order

**Principio:** cada fase entrega algo verificable de punta a punta, no solo infraestructura aislada.

### Fase de build 1: Fundación + identidad
**Prerequisitos:** ninguno
**Entregables verificables:**
- Schema de base de datos + migraciones (Ubicacion, Usuario, Producto, Variante, PrecioHistorico, MovimientoInventario, SaldoInventario)
- Autenticación (login, JWT, refresh) y RBAC funcionando de punta a punta
- Variables de entorno y secrets gestionados por vault/env, nunca hardcodeados
**Dependencias bloqueantes:** todo lo demás depende de esto
**Puede hacerse en paralelo con:** definición de IaC de despliegue

### Fase de build 2: Dominio core — inventario
**Prerequisitos:** Fase 1 completa
**Entregables verificables:**
- Crear producto + variantes desde la web admin
- Registrar movimiento de inventario (entrada/salida/ajuste/traslado) con idempotency key
- Consultar saldo por SKU y ubicación
- Tests de idempotencia y de cálculo de saldo pasando en CI
**Dependencias bloqueantes:** requiere identidad/RBAC de Fase 1

### Fase de build 3: Catálogo público
**Prerequisitos:** Fase 2 completa (necesita variantes y saldo para mostrar disponibilidad)
**Entregables verificables:**
- Catálogo web público con filtros, ficha de producto, deep link de WhatsApp
- Test automatizado que verifica ausencia de campos sensibles en la respuesta pública
- Cache/CDN configurado
**Puede hacerse en paralelo con:** Fase 4 (app móvil), ambas consumen la misma API de Fase 2

### Fase de build 4: App móvil offline-first
**Prerequisitos:** Fase 2 completa (endpoints de inventario)
**Entregables verificables:**
- Registro de movimiento desde app sin conexión, cola local
- Sincronización batch contra `/api/sync/batch`
- Test de envío duplicado de batch sin duplicar movimientos

### Fase de build 5: Devoluciones, imágenes, hardening
**Prerequisitos:** Fases 2-4 completas
**Entregables verificables:**
- Flujo de devolución/cambio de talla como movimientos ligados
- Carga de imágenes con validación de tipo MIME real
- Headers de seguridad (CSP, HSTS, etc.) configurados en producción
- Rate limiting en login y catálogo público
- Auditoría final de configuración (checklist de Sección 9, DoD)

### Fase de build 6: Empaquetado de despliegue (IaC)
**Prerequisitos:** Fase 5 completa
**Entregables verificables:**
- Script de IaC reproducible (Docker Compose + provisión) que instala una instalación completa desde cero
- Instalación de prueba levantada desde el script, sin pasos manuales
**Puede hacerse en paralelo con:** Fase 3 y 4, si el equipo lo prioriza — no es estrictamente secuencial, pero debe estar cerrado antes del primer cliente real

## 10. Riesgos y mitigaciones

| ID | Riesgo | Probabilidad | Impacto | Mitigación | Owner |
|----|--------|-------------|---------|------------|-------|
| R-001 | Costo operativo de mantener N instalaciones crece más rápido que el equipo | Alta | Alto | IaC reproducible desde el día 1 (ADR-005); no aceptar clientes con customizaciones que rompan el patrón de despliegue estándar | Equipo técnico |
| R-002 | Cliente usa el módulo de inventario como sustituto informal de facturación | Media | Medio | Advertencia explícita en capacitación; el sistema no modela transacción de venta (ADR-006) | Equipo comercial |
| R-003 | Conflictos de sincronización offline generan stock negativo | Media | Medio | Resolución determinista por timestamp de servidor; alerta visible al usuario en conflicto (RF-007) | Equipo técnico |
| R-004 | Fuga de costo/margen por regresión futura en el contrato público | Baja | Alto | Test automatizado bloqueante en CI que verifica campos ausentes (Sección 9, DoD) | Equipo técnico |
| R-005 | Crecimiento de volumen de datos no proyectado por instalación | Media | Bajo-Medio | Volumen relevado por cliente en checklist de onboarding (ver `tasks/todo.md`) antes de Fase de build 6; sizing de DB no es un valor global fijo | Equipo técnico |

## 11. Glosario

- **SKU:** unidad de inventario — combinación única de producto + talla + color (+ atributo opcional). Es la unidad real de stock, no el producto genérico.
- **Ledger de movimientos:** registro append-only e inmutable de cada entrada/salida/ajuste/traslado de stock, con autoría y timestamp.
- **Saldo materializado:** cantidad de stock por SKU y ubicación, calculada y actualizada transaccionalmente a partir del ledger.
- **Idempotency Key:** identificador único generado por el cliente para cada intención de operación, usado por el servidor para deduplicar reintentos.
- **RBAC:** Role-Based Access Control — autorización basada en rol del usuario (admin/vendedor/bodega).
- **BOLA:** Broken Object Level Authorization — categoría OWASP de fuga de datos por autorización mal implementada a nivel de objeto.
- **Instalación dedicada:** despliegue de infraestructura propia por cliente, sin compartir base de datos ni proceso con otros clientes (opuesto a SaaS multi-tenant).
- **IaC:** Infrastructure as Code — infraestructura definida y desplegada por script reproducible, no configuración manual.

## 12. Historial de revisiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-08-18 | Usuario + Arch-Sentinel | Versión inicial aprobada. Arquitectura: monolito modular (ADR-001). Alcance excluye POS/DIAN (ADR-006). |
| 1.1 | 2026-08-18 | Usuario + Arch-Sentinel | Cierre de pendientes: stack definitivo (NestJS + Next.js + React Native/Expo, ADR-007), storage de imágenes (Cloudinary, ADR-008), matriz de permisos por rol, SLA y volumen de datos como parámetros de onboarding por instalación, notificaciones push confirmado fuera de alcance, nombre de trabajo asignado (Tienda360). Sin pendientes abiertos que bloqueen inicio de desarrollo. |
| 1.2 | 2026-09-02 | Auditoría de seguridad y funcionalidad | ADR-008 revisado: el storage real de producción es Supabase Storage, no Cloudinary (el código nunca implementó Cloudinary); se documenta la decisión real y se preserva la original por trazabilidad. Corregidos en código y verificados en runtime: escalada de privilegios en el registro público (rol asignable por el cliente), secreto JWT y credenciales de administrador hardcodeadas, CORS permisivo, RBAC fail-open, validación de subida/borrado de archivos, comparación de contraseña en texto plano, paginación sin cota, fuga de stock exacto en el catálogo público. Ver `Markdowns/todo.md` (sección "Revisión") y `Markdowns/lessons.md` para el detalle completo. |
| 1.3 | 2026-09-15 | Desarrollo de faltantes vs SRS | Implementados y verificados: refresh token con rotación (§5), `POST /api/sync/batch` (RF-007/ADR-004), corrección referenciada y AJUSTE bidireccional (RF-003), cambio de talla como movimientos ligados (RF-008), health checks independientes (ADR-001), 413 en subida (RF-009), logging de 401/403/429/5xx (§5) y test de contrato público bloqueante (R-004/DoD). Añadidos: pipeline CI con SAST/secretos/OSV/cobertura, empaquetado Docker (ADR-005) y parche de dependencias (0 advisories). Refresh token conectado en web-admin. Pendientes registrados en `todo.md`: app móvil (Fase 4), UI de usuarios (RF-006), cobertura del resto del backend a ≥50%. |

---

## Pendientes

Ninguno bloqueante. Los dos únicos parámetros que quedan **por diseño** como variables de onboarding (no como huecos de información) son el SLA contractual y el volumen de datos reales — se relevan por cliente antes del despliegue de cada instalación, según el checklist de onboarding referenciado en Sección 5 y 9B.
