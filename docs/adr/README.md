# Registro de Decisiones de Arquitectura (ADR)

> Proceso y reglas: `Ambientes/07-ADR-Decisiones-Arquitectura.md` (en el repo: `docs/referencias/Ambientes/`).
> Reglas rápidas: un ADR por decisión · numeración secuencial que no se reutiliza · un ADR `Aceptado` no se edita: si la decisión cambia, se crea uno nuevo que lo reemplaza y se actualiza esta tabla.
> `Propuesto` = línea base a implementar. Se confirma con el usuario antes de la fase indicada en `docs/07` y luego pasa a `Aceptado`.

## Índice

| ADR                                                      | Título                                                                          | Estado                                 | Fecha      | Confirmar antes de | Reemplaza / Reemplazado por            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------- | ---------- | ------------------ | -------------------------------------- |
| [0001](0001-registrar-decisiones-de-arquitectura.md)     | Registrar las decisiones de arquitectura mediante ADR                           | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0002](0002-pwa-offline-first-sin-backend.md)            | PWA offline-first, sin backend propio                                           | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0003](0003-stack-typescript-react-vite-fluent.md)       | Stack TypeScript + React + Vite + Fluent UI v9                                  | Aceptado (UI reemplazada parcialmente) | 2026-10-21 | —                  | UI → ADR-0022                          |
| [0004](0004-arquitectura-spa-modular-por-capas.md)       | SPA (CSR) modular por features con capas                                        | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0005](0005-gestion-de-estado.md)                        | Estado: Dexie liveQuery + Zustand                                               | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0006](0006-autenticacion-entra-id-msal.md)              | Entra ID + MSAL.js (SPA, PKCE, delegado), confirmación al sincronizar           | Aceptado                               | 2026-10-21 | F4 (PA-06)         | —                                      |
| [0007](0007-permisos-graph-sites-selected.md)            | Permisos Graph `Sites.Selected` delegado                                        | Aceptado                               | 2026-10-21 | F0 (spike S2)      | —                                      |
| [0008](0008-persistencia-local-indexeddb-dexie.md)       | Persistencia local IndexedDB con Dexie                                          | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0009](0009-modelo-remoto-sharepoint.md)                 | Modelo remoto: listas + biblioteca en SharePoint                                | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0010](0010-sincronizacion-y-conflictos.md)              | Sincronización por estado, push → pull, merge a 3 vías                          | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0011](0011-imagenes-y-archivos.md)                      | Fotos JPEG ≤ 1920 px q = 0,75; PDF ≤ 20 MB; upload sessions                     | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0012](0012-flujo-de-servicio-por-etapas.md)             | Flujo del servicio como máquina de estados                                      | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0013](0013-notificaciones-power-automate.md)            | Correo de OT y alertas con Power Automate                                       | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0014](0014-hosting-cloudflare-pages-y-actualizacion.md) | Hosting en Cloudflare Pages + actualización vía SW                              | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0015](0015-branching-y-versionado.md)                   | Ramas cortas, Conventional Commits, SemVer, sin CI/CD                           | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0016](0016-metodologia-kanban-personal.md)              | Kanban personal con DoR/DoD                                                     | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0017](0017-observabilidad-sin-backend.md)               | Observabilidad: log local + LogSincronizacion                                   | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0018](0018-seguridad-datos-locales-y-tokens.md)         | Seguridad local: sin cifrado propio; MSAL en localStorage (riesgo aceptado)     | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0019](0019-ui-accesibilidad-i18n.md)                    | UI Fluent mobile-first, WCAG 2.2 AA, es-CO, sin SEO                             | Reemplazado                            | 2026-10-21 | —                  | Reemplazado por ADR-0022               |
| [0020](0020-ambientes-y-configuracion.md)                | Ambientes DEV y PRD separados                                                   | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0021](0021-spec-driven-development.md)                  | Spec-Driven Development: constitución + spec/plan/tasks                         | Aceptado                               | 2026-10-21 | —                  | —                                      |
| [0022](0022-sistema-de-diseno-propio.md)                 | Sistema de diseño propio (pantallas de referencia) con React Aria + CSS Modules | Aceptado                               | 2026-10-21 | —                  | Reemplaza ADR-0019 y la UI de ADR-0003 |
| [0023](0023-clientes-creados-desde-la-app-y-fusion.md)   | Clientes creados desde la app (permanentes) y fusión de clientes                | Aceptado                               | 2026-11-16 | —                  | —                                      |

## Correspondencia con los ADR mínimos de la guía

| ADR mínimo (guía)                                                                            | Cubierto por                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Uso de ADR                                                                                   | 0001                                                    |
| Lenguaje, framework y stack                                                                  | 0002, 0003                                              |
| Patrón de arquitectura                                                                       | 0004                                                    |
| Login y sesiones                                                                             | 0006, 0018                                              |
| Base de datos y caché                                                                        | 0008, 0009                                              |
| Branching y fixes                                                                            | 0015                                                    |
| Mecanismo de actualización / distribución                                                    | 0014                                                    |
| Metodología SDLC                                                                             | 0016                                                    |
| Web: framework, renderizado, estado, organización, build, PWA, tokens, i18n/SEO              | 0003, 0004, 0005, 0014, 0018, 0022                      |
| Móvil: nativo vs. multiplataforma, offline y conflictos, almacenamiento seguro, distribución | 0002, 0010, 0018, 0014                                  |
| Móvil: notificaciones push                                                                   | No aplica en v1.0 (correo vía 0013; push en el backlog) |
| Móvil: versiones mínimas de SO                                                               | PRD §11 (Android 10+, iOS/iPadOS 17+)                   |

## Decisiones vigentes (resumen)

- **Tipo de app**: PWA instalable, offline-first, sin backend → 0002
- **Stack**: TS + React + Vite → 0003
- **Diseño visual**: sistema propio según las pantallas de referencia, adaptable por dispositivo → 0022
- **Login**: Entra ID + MSAL, confirmación al sincronizar → 0006
- **Datos**: IndexedDB (Dexie) local ↔ SharePoint (Graph) → 0008, 0009, 0010
- **Hosting**: Cloudflare Pages, despliegue manual → 0014
- **Git**: ramas cortas, sin CI/CD → 0015

## Historial de cambios de decisión

| Fecha      | Cambio                                                                                                                           | ADR nuevo | ADR reemplazado                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------- |
| 2026-10-21 | El usuario entregó las pantallas de referencia: Fluent UI se reemplaza por un sistema de diseño propio adaptable por dispositivo | ADR-0022  | ADR-0019 (total), ADR-0003 (parte UI) |
