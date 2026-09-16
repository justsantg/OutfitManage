# 👔 OutfitManage / Tienda360
**Catálogo Virtual Omnicanal + Sistema de Gestión de Inventario Ledger en Tiempo Real**

Sistema integral para tiendas de moda y confección, compuesto por una vitrina pública de alta conversión (Web & PWA Móvil) y un panel administrativo para gestión de almacenes, existencias multitienda, roles RBAC y trazabilidad inmutable de movimientos.

---

## 🚀 Inicio Rápido en Local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar base de datos (PostgreSQL)
cd apps/backend
npx prisma generate
npx prisma db push
cd ../..

# 3. Iniciar entorno de desarrollo
pnpm dev
```

- 🛍️ **Frontend Catálogo & Panel Admin:** [http://localhost:4200](http://localhost:4200)
- 🔌 **Backend API REST:** [http://localhost:3000](http://localhost:3000)
- 📑 **Swagger UI Docs:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 📚 Documentación Técnica Detallada

- 📖 **[Guía de Ejecución Local, Testing & Despliegue en Producción](Markdowns/guia-ejecucion-y-despliegue.md)** *(Lectura recomendada para testing y DevOps)*
- 📋 **[Especificación de Requerimientos del Sistema (SRS v1.1)](Markdowns/SRS.md)**
- 🗄️ **[Estructura de Base de Datos y Modelo de Tablas](Markdowns/tables.md)**
- ✅ **[Seguimiento de Fases y Funcionalidades](Markdowns/todo.md)**

---

## 🛠️ Stack Tecnológico

- **Backend:** NestJS 11, Prisma ORM, PostgreSQL, Passport JWT, Throttler Rate Limiting, Swagger OpenAPI.
- **Frontend:** Next.js 15 (App Router), TailwindCSS, Framer Motion, Three.js (WebGL 3D), PWA (Service Workers).
- **Monorepo:** pnpm Workspaces + Turborepo.
