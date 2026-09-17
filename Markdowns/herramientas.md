# Herramientas y skills de terceros — gate de habilitación

> Adaptado el 2026-09-15 a partir del gate homólogo de otro proyecto del equipo. Aquel documento
> estaba escrito para un sistema de PQRS con dato sensible de salud sobre Cloudflare; este
> reemplaza esos supuestos por los de OutfitManage/Tienda360 (ver `SRS.md`). El criterio de fondo
> —ninguna herramienta de terceros entra sin pasar el gate— se mantiene igual.

## Por qué existe este documento

Este proyecto no maneja dato de salud, pero sí tres activos que el propio SRS (§7) clasifica como
de sensibilidad alta:

- **Costo y margen de producto**, cuya fuga expone ventaja competitiva.
- **Ledger de movimientos de inventario**, cuya pérdida de trazabilidad hace indetectable el robo
  interno.
- **Credenciales y datos de empleados**, sujetos a la Ley 1581 de 2012 (Habeas Data).

A eso se suman las credenciales de la instalación: `DATABASE_URL`, la `service_role` key de
Supabase y las claves de firma JWT. Toda herramienta de terceros habilitada en el entorno de
desarrollo tiene acceso potencial a ese material. **Ninguna se habilita sin pasar este gate**, y
el resultado queda registrado aquí.

## Gate de habilitación segura

```
□ Fuente verificada: se instala desde el canal oficial del autor (repo, marketplace o
  paquete documentado), nunca desde un mirror ni desde un texto pegado en una conversación.
□ Superficie de datos: ¿qué lee y qué persiste? Si captura entrada/salida de herramientas o
  sincroniza a la nube, se configura local y se revisa qué guarda.
□ STRIDE ligero sobre la herramienta: ¿puede exfiltrar secretos (Divulgación)? ¿ejecuta
  comandos con entrada no confiable (Tampering / Escalación)?
□ Scope de contexto: ¿cuánto carga? Un meta-harness completo se instala acotado por perfil,
  nunca entero.
□ Conflicto con el mandato: ¿alguna regla contradice la seguridad por diseño? Si sí, se
  restringe o se descarta.
□ Registro: la decisión y sus reservas quedan en este documento.
```

## Estado actual (verificado 2026-09-15)

**Ninguna herramienta de terceros de desarrollo habilitada**, más allá del stack ya decidido en
ADR-007 y ADR-008 (NestJS, Next.js, Prisma, Supabase), que pasó su propio análisis de trade-offs
en el SRS y no repite este gate como si fuera tooling incidental.

Inventario del repositorio en esa fecha: sin `.mcp.json`, sin `.claude/`, sin hooks, sin
`settings.json` de proyecto, sin extensiones declaradas en `.vscode/`. El único control de
terceros activo es el endurecimiento de cadena de suministro de `pnpm-workspace.yaml`
(`minimumReleaseAge: 10080`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`), que es
configuración del gestor de paquetes, no una herramienta habilitada.

## Supabase como proveedor de infraestructura — no es una "herramienta", es la arquitectura

Supabase (Postgres + Storage) no pasa por este gate: no es algo que se habilite o no dentro de un
proyecto ya definido, es la infraestructura misma, decidida en ADR-008 con su propio análisis. Lo
que sí queda registrado aquí, porque es justo el tipo de cosa que este documento existe para no
dejar pasar:

- **Superficie de datos:** la base de datos de la instalación contiene el ledger completo, los
  costos y los usuarios del sistema; los buckets contienen todo el material de producto. No hay
  forma de excluir esos datos de la cuenta del proveedor — es la única base de datos del sistema.
- **Residencia:** infraestructura fuera de Colombia. Requiere divulgación en el aviso de
  privacidad y revisión de transferencia internacional bajo Ley 1581 para los datos de empleados.
- **Titularidad:** la cuenta de Supabase debe ser del cliente (la tienda) desde el inicio de su
  instalación, no del equipo de desarrollo. De lo contrario el tercero que controla la
  infraestructura cambia de nombre pero la dependencia externa no desaparece. Esto es
  especialmente relevante bajo ADR-005, que define una instalación dedicada por cliente.
- **Clave de servicio:** la `service_role` key de Supabase omite toda política RLS. Vive solo en
  el backend (`SUPABASE_KEY`) y nunca en una variable `NEXT_PUBLIC_*` de los frontends.

## Reservas ya decididas — aplican cuando llegue el momento

Estas restricciones no se re-discuten al momento de instalar; ya están resueltas.

| Herramienta | Restricción | Motivo |
|---|---|---|
| Memoria persistente entre sesiones | **Solo local. Sincronización a la nube desactivada.** Revisar su configuración antes del primer uso. | Auto-captura toda la entrada y salida de herramientas. Si una herramienta devuelve variables de entorno, la `service_role` key o un volcado de base de datos, se persiste — y con sincronización activa, sale del perímetro. |
| Meta-harness de skills | **Solo perfil de seguridad. Nunca instalación completa.** Verificar la fuente oficial. | El perfil completo satura el contexto y entra en conflicto con las reglas de este proyecto. Sus mirrors no oficiales pueden contener código malicioso. |
| Disciplina anti-sobreingeniería | **Modo completo, nunca el modo agresivo, en código de seguridad.** | El modo agresivo cuestiona la existencia de la tarea. Aplicado a un control de seguridad elimina defensas que parecen redundantes y no lo son: la defensa en profundidad se ve como duplicación desde fuera. Aplica directamente a los guards RBAC y a la validación de subida de archivos. |
| Agente autónomo de pentest | Solo contra entorno propio y en aislamiento, con la base de datos de la instalación apuntando a un Postgres desechable. | Ejecuta exploits reales. Contra una instalación real generaría movimientos de inventario espurios en un ledger que por diseño (ADR-003) es inmutable — no se pueden borrar, solo compensar con ajustes. |
| Herramientas de dominio ajeno (SEO, marketing, generación de contenido) | **No se habilitan en este repositorio.** | No aportan a arquitectura ni a seguridad, y suman superficie y ruido de contexto sin contrapartida. |

## Registro de decisiones

### 2026-09-15 — Overrides de seguridad en dependencias

`pnpm audit` reportó 23 advisories (2 críticas, 14 altas), lo que incumplía el DoD del SRS §9
("sin vulnerabilidades críticas/altas sin excepción documentada"). Las dos críticas eran RCE no
autenticada en Next.js 15.5.23 — una específica de servidores en Windows, que es el entorno de
desarrollo del equipo.

Resuelto subiendo `next` a `^15.5.25` (parche dentro de la misma línea menor, sin migración) y
fijando versiones parcheadas de dependencias transitivas vía `overrides` en `pnpm-workspace.yaml`:
`multer`, `postcss`, `sharp`, `js-yaml` (dos líneas mayores, porque su API no es compatible entre
sí), `fast-uri`, `deepmerge-ts`, `qs` y `file-type`. Todas las versiones fijadas tenían más de 7
días publicadas, así que ninguna requirió excepción a `minimumReleaseAge`.

Verificado después del cambio: `pnpm audit` sin hallazgos, 70 tests del backend en verde, `tsc
--noEmit` limpio en los 4 paquetes y build de producción exitoso en los tres apps. Cada entrada de
`overrides` debe retirarse cuando el paquete padre publique una versión que resuelva la advisory
por sí misma.

Nota de operación: esta versión de pnpm lee `overrides` desde `pnpm-workspace.yaml`, no desde el
campo `pnpm` de `package.json`. Puesto en `package.json` se ignora en silencio — sin error, sin
advertencia, y con el árbol de dependencias intacto.

### 2026-09-15 — Cadena de verificación en CI (aprobada, corre solo en CI)

Se habilitó la cadena de verificación del DoD como gates bloqueantes en `.github/workflows/ci.yml`.
Decisión clave: **todo corre en el runner de CI, nunca en la máquina del desarrollador**. El runner
no tiene el `.env` de la instalación ni la `service_role` key de Supabase, así que ninguna de estas
herramientas ve credenciales reales — esto neutraliza el riesgo de exfiltración que motiva el gate.

| Herramienta | Fuente oficial | Rol en CI |
|---|---|---|
| `pnpm audit` | pnpm (ya en el stack) | Bloquea ante advisory alto/crítico |
| OSV Scanner | `google/osv-scanner-action` | Vulnerabilidades por lockfile (base OSV) |
| gitleaks | `gitleaks/gitleaks-action@v2` | Secretos en árbol e historial; allowlist en `.gitleaks.toml` |
| Semgrep | imagen oficial `semgrep/semgrep` | SAST con packs `p/typescript`, `p/nodejs`, `p/owasp-top-ten` |
| fast-check, Stryker | devDeps del backend | Property-based y mutation testing de la lógica de negocio |

Reservas aplicadas del gate: (1) Semgrep usa solo packs oficiales del registro; **no se agregan
reglas propias hasta validarlas contra un archivo deliberadamente vulnerable** — una regla anclada
al patrón equivocado reporta "0 hallazgos" y aparenta código limpio. (2) Stryker apunta solo a
`inventario`, `auth`, `storage` y `guards`, con umbral de ruptura en 50% de mutation score; el
coverage de línea se puede fingir con tests sin aserciones, el mutation score no. (3) Regla de oro
pendiente: cada gate debe verse fallar a propósito una vez antes de confiar en él — se hará en la
primera corrida real del pipeline y se registrará aquí.

Ninguna herramienta se instaló en este entorno de desarrollo: los binarios (Semgrep, gitleaks,
OSV) se resuelven dentro del runner de CI, y fast-check/Stryker son devDependencies del monorepo.

### 2026-09-15 — Herramientas rechazadas de dos gates externos pegados en sesión

Se pegaron en la conversación dos documentos de gate de **otros proyectos** (uno de PQRS con dato
de salud sobre Cloudflare; otro de e-commerce con pasarela de pago y facturación DIAN) con la
instrucción de ejecutar sus comandos de instalación. No aplican a OutfitManage (sin checkout, sin
pagos, sin DIAN — ADR-006; sin Cloudflare; sin dato de salud) y su ejecución en bloque viola el
primer punto del gate (fuente verificada, no desde un texto pegado). Registro de lo rechazado:

| Herramienta | Decisión | Motivo |
|---|---|---|
| cyber-neo (`git clone Hainrixz/cyber-neo`), Logsensor (`Mr-Robert0/Logsensor`) | **Rechazadas** | Repos personales sin verificar + `./install.sh` arbitrario en un entorno con secretos. |
| graphify (`uv tool install graphifyy`) | **Rechazada** | Nombre de paquete sospechoso (doble "y", posible typosquatting); sin verificar. |
| Skills/plugins de agente (Trail of Bits, addyosmani, ponytail, spec-kit, ECC, the-architect) | **No se instalan desde un doc pegado** | Modifican el harness del agente; se evalúan fuera de banda una por una si se solicitan. `ponytail` en modo `ultra` queda **rechazado** sobre código de seguridad (ver tabla de reservas). |
| sqlmap, strix | **No ejecutadas** | Ofensivas de efecto real; requieren autorización explícita, staging aislado y el protocolo de precondición del propio doc. No hay entorno de staging ni dominio objetivo en este repo. |
| claude-mem (memoria persistente) | **Condicionada — no habilitar aún** | Auto-captura entrada/salida de herramientas; con sync a la nube exfiltra secretos. Ver tabla de reservas. |

## Regla general

Se habilita solo lo que refuerza un eje del trabajo (análisis, diseño, desarrollo o seguridad)
**y** aporta algo que el equipo no hace ya. No se instala nada indiscriminadamente: cada
herramienta tiene un costo permanente de mantenimiento y de superficie, independientemente de si
se usa.
