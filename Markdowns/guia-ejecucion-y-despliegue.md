# 📖 Guía Completa de Ejecución Local, Testing y Despliegue en Producción
**Sistema OutfitManage / Tienda360 — Catálogo Virtual + Gestor de Inventario Omnicanal**

---

## 📌 Índice
1. [Arquitectura y Estructura del Monorepo](#1-arquitectura-y-estructura-del-monorepo)
2. [Requisitos Previos del Sistema](#2-requisitos-previos-del-sistema)
3. [Configuración de Variables de Entorno (.env)](#3-configuración-de-variables-de-entorno-env)
4. [Paso a Paso: Ejecución en Entorno Local (Desarrollo)](#4-paso-a-paso-ejecución-en-entorno-local-desarrollo)
5. [Pruebas en Dispositivos Móviles y PWA (Red Local Wi-Fi)](#5-pruebas-en-dispositivos-móviles-y-pwa-red-local-wi-fi)
6. [Guía de Testing y Validación de Calidad (QA)](#6-guía-de-testing-y-validación-de-calidad-qa)
7. [Guía de Despliegue en Producción (Cloud & VPS)](#7-guía-de-despliegue-en-producción-cloud--vps)
8. [Resolución de Problemas Comunes (Troubleshooting)](#8-resolución-de-problemas-comunes-troubleshooting)

---

## 1. Arquitectura y Estructura del Monorepo

El proyecto está estructurado como un **Monorepo** administrado con `pnpm workspaces` y `Turborepo`:

```text
OutfitManage/
├── apps/
│   ├── backend/             # API REST Backend (NestJS 11 + Prisma ORM + PostgreSQL + Swagger + JWT)
│   └── web-catalogo/        # Frontend Omnicanal (Next.js 15 App Router + TailwindCSS + Three.js 3D + PWA)
├── Markdowns/               # Documentación Técnica, SRS v1.1, Kardex y Guías
├── package.json             # Configuración raíz del Monorepo (pnpm@11.22.0)
├── pnpm-workspace.yaml      # Definición de workspaces
└── turbo.json               # Pipeline de compilación y ejecución Turbo
```

### Puertos por defecto en Local:
- **Backend API (NestJS):** `http://localhost:3000`
- **Documentación Swagger / OpenAPI:** `http://localhost:3000/api/docs`
- **Frontend Catálogo + Panel Administrativo (Next.js):** `http://localhost:4200`
- **Proxy Interno:** La web redirige `/backend-public/*` y `/backend-api/*` directamente a NestJS sin fricción de CORS ni bloqueos de firewall.

---

## 2. Requisitos Previos del Sistema

Antes de iniciar, asegúrate de tener instalado en tu máquina de desarrollo:

1. **Node.js:** Versión `>= 20.x` (LTS recomendada, ej. v20.x o v22.x).
2. **pnpm:** Versión `>= 9.x` u `11.x`. Si no lo tienes, instálalo globalmente con:
   ```bash
   npm install -g pnpm
   ```
3. **Base de Datos PostgreSQL:**
   - Una instancia de PostgreSQL `>= 15` local, o
   - Una base de datos en la nube gratuita (como **Supabase**, **Neon Serverless Postgres** o **Railway**).
4. **Git:** Para control de versiones.

---

## 3. Configuración de Variables de Entorno (.env)

### A. Backend (`apps/backend/.env`)
Crea un archivo `.env` dentro de la carpeta `apps/backend/`:

```ini
# ===================================================
# CONFIGURACIÓN DEL BACKEND (NestJS)
# ===================================================
PORT=3000
NODE_ENV=development

# 1. Conexión a la Base de Datos PostgreSQL (Local o Supabase / Neon)
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/tienda360?schema=public"

# 2. Seguridad & Tokens JWT
JWT_SECRET="clave_secreta_super_segura_para_firmar_tokens_jwt_2026"
JWT_EXPIRES_IN="7d"

# 3. CORS (Orígenes permitidos separados por coma)
CORS_ORIGIN="http://localhost:4200,http://localhost:3001"

# 4. Almacenamiento de Imágenes (Supabase Storage - Opcional para desarrollo local)
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_KEY="tu-supabase-anon-o-service-key"
SUPABASE_BUCKET_NAME="outfit-media"
```

### B. Frontend (`apps/web-catalogo/.env.local`)
Crea un archivo `.env.local` dentro de la carpeta `apps/web-catalogo/`:

```ini
# ===================================================
# CONFIGURACIÓN DEL FRONTEND (Next.js)
# ===================================================
PORT=4200

# En desarrollo local dejar vacío para usar el proxy automático de Next.js
# En producción, colocar la URL pública del backend desplegado
NEXT_PUBLIC_API_URL=

# URL interna para comunicación servidor a servidor
INTERNAL_BACKEND_URL="http://localhost:3000"

# Número de WhatsApp oficial para recibir pedidos de clientes (código de país sin '+')
NEXT_PUBLIC_WHATSAPP_NUMBER="573001234567"
```

---

## 4. Paso a Paso: Ejecución en Entorno Local (Desarrollo)

### Paso 1: Instalar dependencias del monorepo
Desde la raíz del proyecto (`OutfitManage/`):
```bash
pnpm install
```

### Paso 2: Configurar y sincronizar la Base de Datos
1. Ve a la carpeta del backend:
   ```bash
   cd apps/backend
   ```
2. Genera el cliente de Prisma y aplica las migraciones:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. *(Opcional)* Si deseas ver o administrar los registros directamente en una interfaz visual:
   ```bash
   npx prisma studio
   ```
   *(Abre una interfaz web en `http://localhost:5555`)*.
4. Regresa a la raíz:
   ```bash
   cd ../..
   ```

### Paso 3: Iniciar ambos servicios en paralelo
Desde la raíz del proyecto ejecuta:
```bash
pnpm dev
```

Este comando utilizará **Turborepo** para iniciar simultáneamente:
- `backend:dev` en `http://localhost:3000` (escuchando en `0.0.0.0:3000`)
- `web-catalogo:dev` en `http://localhost:4200` (escuchando en `0.0.0.0:4200`)

---

## 5. Pruebas en Dispositivos Móviles y PWA (Red Local Wi-Fi)

El sistema cuenta con soporte de **Progressive Web App (PWA)** instalable como aplicación nativa en Android e iOS.

### ¿Cómo probarlo desde tu celular en la misma red Wi-Fi?
1. En tu computador, abre una terminal y consulta tu IP local:
   - **En Windows:** Ejecuta `ipconfig` y busca tu `Dirección IPv4` (ejemplo: `192.168.1.15`).
   - **En Mac/Linux:** Ejecuta `ifconfig` o `ip a`.
2. En el navegador de tu teléfono (Chrome o Safari), abre:
   ```text
   http://[TU_IP_LOCAL]:4200
   ```
   *(Ejemplo: `http://192.168.1.15:4200`)*.

### ¿Cómo instalar la PWA en el celular?
- **En Android (Google Chrome):**
  - Toca el menú de tres puntos (`⋮`) arriba a la derecha.
  - Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
- **En iPhone / iPad (Safari):**
  - Toca el botón de **Compartir** (icono con flecha hacia arriba).
  - Selecciona **"Agregar al inicio"** (*Add to Home Screen*).
  - La app se abrirá sin barras del navegador en modo pantalla completa (*standalone*).

---

## 6. Guía de Testing y Validación de Calidad (QA)

### A. Verificación Estática de TypeScript
Asegúrate de que no existan errores de tipos antes de enviar a producción:
```bash
# Validar Backend
pnpm --filter backend exec tsc --noEmit

# Validar Frontend
pnpm --filter web-catalogo exec tsc --noEmit
```

### B. Pruebas de Endpoints con Swagger UI
Abre en tu navegador `http://localhost:3000/api/docs`.

1. **Prueba de Autenticación & Rate Limiting:**
   - Realiza un `POST /api/auth/register` con rol `ADMIN`, `VENDEDOR` o `BODEGA`.
   - Realiza un `POST /api/auth/login`. Si intentas más de 5 intentos fallidos en 1 minuto, el sistema bloqueará la IP temporalmente (`429 Too Many Requests`).
   - Copia el `accessToken` e ingrésalo en el botón verde superior **Authorize** (`Bearer <token>`).

2. **Prueba de Creación de Producto & Variantes:**
   - `POST /api/categorias`: Crea una categoría (ej. "Chaquetas").
   - `POST /api/ubicaciones`: Crea una Bodega Principal y una Tienda.
   - `POST /api/productos`: Crea un producto con al menos 2 variantes SKU (tallas `S`, `M`, colores y precio).

3. **Prueba del Kardex Ledger & Idempotencia:**
   - `POST /api/inventario/movimientos`: Envía un movimiento de tipo `ENTRADA` con el header `Idempotency-Key: test-uuid-1234`.
   - Si envías la misma petición dos veces con la misma clave, el sistema responderá con el resultado previo sin duplicar el inventario (ADR-004).

4. **Prueba del Catálogo Público (Sin Login):**
   - `GET /public/catalogo`: Debe retornar las prendas activas con disponibilidad booleana `disponible: true/false` sin exponer costos ni saldos numéricos.

---

## 7. Guía de Despliegue en Producción (Cloud & VPS)

### Opción A: Despliegue Cloud Moderno (Recomendada)
Esta arquitectura es Serverless/PaaS, escalable automáticamente y de costo cero o mínimo.

```mermaid
graph LR
    User[Cliente / Celular] -->|HTTPS| Vercel[Frontend Next.js en Vercel]
    Admin[Administrador] -->|HTTPS| Vercel
    Vercel -->|API REST| Render[Backend NestJS en Render / Railway]
    Render -->|Conexión Segura SSL| Supabase[(PostgreSQL en Supabase / Neon)]
    Render -->|Media Storage| S3[(Supabase Storage)]
```

#### 1. Base de Datos (Supabase o Neon):
- Crea un proyecto gratuito en [Supabase](https://supabase.com) o [Neon](https://neon.tech).
- Copia la cadena de conexión de PostgreSQL en modo `Transaction Pooler` o directo:
  `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`

#### 2. Backend (Render o Railway):
- Conecta el repositorio de GitHub en [Render](https://render.com) o [Railway](https://railway.app).
- **Root Directory:** `apps/backend`
- **Build Command:** `pnpm install && npx prisma generate && npx prisma migrate deploy && pnpm build`
- **Start Command:** `node dist/main.js`
- **Variables de Entorno en Render:**
  - `DATABASE_URL`: Tu URL de PostgreSQL con SSL.
  - `JWT_SECRET`: Clave aleatoria de 64 caracteres.
  - `CORS_ORIGIN`: La URL de tu frontend en producción (ej. `https://tu-tienda.vercel.app`).
  - `PORT`: `3000`

#### 3. Frontend Catálogo (Vercel):
- Conecta el repositorio en [Vercel](https://vercel.com).
- **Framework Preset:** `Next.js`
- **Root Directory:** `apps/web-catalogo`
- **Variables de Entorno en Vercel:**
  - `NEXT_PUBLIC_API_URL`: `https://tu-backend.onrender.com`
  - `NEXT_PUBLIC_WHATSAPP_NUMBER`: `573001234567`
- Vercel compilará automáticamente la PWA, los service workers y optimizará las imágenes.

---

### Opción B: Despliegue en Servidor VPS Dedicado con Docker
Si despliegas en un servidor Ubuntu / Debian con Docker:

1. **Construir imágenes:**
   ```bash
   # Build Backend
   docker build -t outfit-backend -f apps/backend/Dockerfile .
   
   # Build Frontend
   docker build -t outfit-web -f apps/web-catalogo/Dockerfile .
   ```
2. **Ejecutar contenedores con Docker Compose o red interna**:
   - Backend mapeado a `127.0.0.1:3000`
   - Frontend mapeado a `127.0.0.1:3001`
   - Nginx como Reverse Proxy con certificado SSL emitido por Let's Encrypt (`certbot --nginx`).

---

## 8. Resolución de Problemas Comunes (Troubleshooting)

### 1. `Cannot find module '.../dist/main'`
- **Causa:** El backend no se ha compilado o se inició antes de terminar la primera escritura de TypeScript.
- **Solución:** Ejecuta `pnpm --filter backend build` y luego reinicia con `pnpm dev`.

### 2. `Missing devEngines.packageManager or legacy packageManager field`
- **Causa:** Turborepo 2.x requiere declarar el gestor en `package.json`.
- **Solución:** Ya se encuentra configurado `"packageManager": "pnpm@11.22.0"` en el `package.json` raíz.

### 3. `Failed to fetch` o `ERR_CONNECTION_RESET` en el celular
- **Causa:** El celular no puede alcanzar la IP local de tu computador o está usando datos móviles en lugar del Wi-Fi.
- **Solución:**
  1. Verifica que ambos dispositivos estén en la misma red Wi-Fi.
  2. Usa la IP local de tu PC (`http://192.168.x.x:3001`).
  3. Gracias al proxy interno de Next.js, no necesitas configurar puertos adicionales.

### 4. Cambios en la base de datos no se reflejan en el código
- **Solución:** Cuando modifiques `schema.prisma`, regenera siempre los tipos de TypeScript con:
  ```bash
  cd apps/backend && npx prisma generate
  ```

---

> 📄 **Documentación Adicional:**
> - [Especificación de Requerimientos SRS v1.1](file:///d:/Proyectos%20personales/OutfitManage/Markdowns/SRS.md)
> - [Estructura de Tablas y Base de Datos](file:///d:/Proyectos%20personales/OutfitManage/Markdowns/tables.md)
> - [Lista de Tareas y Fases Completadas](file:///d:/Proyectos%20personales/OutfitManage/Markdowns/todo.md)
