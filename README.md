# Servicio Técnico de Baterías y Cargadores — PWA offline-first

Aplicación web progresiva (PWA) **instalable y offline-first** para registrar el ciclo de servicio de **baterías y cargadores** (recepción → diagnóstico → cotización → orden de trabajo → entrega → facturación, o disposición final). Los técnicos capturan datos, fotos optimizadas y PDFs **sin conexión**. Cuando hay red, el usuario **confirma su identidad con su cuenta del tenant Microsoft 365 (Entra ID)** y la app sube los registros a **SharePoint Online** mediante Microsoft Graph.

- **Sin backend propio**: la app corre completa en el dispositivo; el hosting solo entrega archivos estáticos.
- **Un solo código** para Android, iOS/iPadOS, Windows y macOS (celular, tablet, laptop, escritorio).
- **Fuente de datos oficial**: SharePoint (listas + biblioteca de documentos).

> **Estado del proyecto**: 📐 Diseño completo — pendiente de implementación.
> Fecha de la versión de diseño: 2026-10-21.

---

## Mapa de la documentación

| # | Documento | Para qué sirve |
|---|---|---|
| — | [CLAUDE.md](CLAUDE.md) | **Instrucciones para el agente de IA que implementa.** Leer primero. |
| 01 | [docs/01-PRD.md](docs/01-PRD.md) | Requerimientos de producto: problema, usuarios, alcance, historias, RF/RNF, preguntas abiertas. |
| 02 | [docs/02-SDD.md](docs/02-SDD.md) | Diseño de software: arquitectura, módulos, sincronización, auth, archivos, seguridad, errores. |
| 03 | [docs/03-Modelo-de-Datos.md](docs/03-Modelo-de-Datos.md) | Diccionario de datos (Excel → formulario → IndexedDB → SharePoint), validaciones, catálogos. |
| 04 | [docs/04-UX-Pantallas-y-Menus.md](docs/04-UX-Pantallas-y-Menus.md) | Navegación, pantallas, wireframes, menús (usuario, técnico, ayuda, versión, configuración). |
| 05 | [docs/05-Stack-y-Entorno-de-Desarrollo.md](docs/05-Stack-y-Entorno-de-Desarrollo.md) | **Stack completo y paso a paso de instalación** en el PC de desarrollo. |
| 06 | [docs/06-Configuracion-Tenant-M365.md](docs/06-Configuracion-Tenant-M365.md) | Configuración de Entra ID (App Registration), SharePoint y Power Automate. |
| 07 | [docs/07-Plan-de-Implementacion.md](docs/07-Plan-de-Implementacion.md) | Fases, tareas, criterios de aceptación y orden de construcción. |
| 08 | [docs/08-Plan-de-Pruebas.md](docs/08-Plan-de-Pruebas.md) | Estrategia de pruebas, escenarios offline/sync, matriz de dispositivos. |
| 09 | [docs/09-Despliegue-Operacion-y-Soporte.md](docs/09-Despliegue-Operacion-y-Soporte.md) | Build, despliegue, versionado, instalación por dispositivo, respaldo, soporte. |
| 10 | [docs/10-Sistema-de-Diseno.md](docs/10-Sistema-de-Diseno.md) | **Estilo visual**: tokens, componentes, adaptación por dispositivo y correspondencia con las pantallas de referencia ([docs/diseno/referencia/](docs/diseno/referencia/)). |
| ADR | [docs/adr/README.md](docs/adr/README.md) | Registro de decisiones de arquitectura (índice y estados). |
| ⚖️ | [.specify/memory/constitution.md](.specify/memory/constitution.md) | **Constitución**: 11 principios no negociables para specs, planes y código. |
| 📋 | [specs/README.md](specs/README.md) | **Spec-Driven Development**: una carpeta por funcionalidad con `spec.md` (qué/por qué), `plan.md` (cómo) y `tasks.md` (tareas ejecutables). |

### Dos capas de documentación
- **Diseño** (`docs/`): PRD, SDD (*Software Design Document*), modelo de datos, UX y ADR. Visión global del producto y la arquitectura.
- **Especificaciones ejecutables** (`specs/` + `.specify/`): *Spec-Driven Development* compatible con GitHub Spec Kit. Cada funcionalidad se construye con el flujo **specify → clarify → plan → tasks → implement → verify**, respetando la constitución. Los `plan.md` citan el SDD en lugar de repetirlo.

**Orden de lectura sugerido**: `CLAUDE.md` → constitución → PRD → SDD → Modelo de datos → ADR → `specs/README.md` → la spec de la fase en curso.

## Decisiones vigentes (resumen)

| Tema | Decisión | ADR |
|---|---|---|
| Tipo de app | PWA instalable, offline-first, sin backend | [0002](docs/adr/0002-pwa-offline-first-sin-backend.md) |
| Stack | TypeScript + React + Vite | [0003](docs/adr/0003-stack-typescript-react-vite-fluent.md) |
| Diseño visual | Sistema propio según las pantallas de referencia: degradado azul-violeta, tarjetas blancas, botón amarillo, Montserrat. Mobile-first y adaptable (celular, tablet, escritorio) | [0022](docs/adr/0022-sistema-de-diseno-propio.md) |
| Arquitectura | SPA (CSR) modular por features + capas (dominio / aplicación / infraestructura) | [0004](docs/adr/0004-arquitectura-spa-modular-por-capas.md) |
| Estado | Dexie `liveQuery` (datos) + Zustand (sesión/UI) | [0005](docs/adr/0005-gestion-de-estado.md) |
| Login | Entra ID + MSAL.js (SPA, PKCE, delegado), confirmación al sincronizar | [0006](docs/adr/0006-autenticacion-entra-id-msal.md) |
| Permisos | Graph `Sites.Selected` delegado | [0007](docs/adr/0007-permisos-graph-sites-selected.md) |
| Datos locales | IndexedDB con Dexie (registros + archivos) | [0008](docs/adr/0008-persistencia-local-indexeddb-dexie.md) |
| Datos remotos | SharePoint: listas + biblioteca vía Microsoft Graph | [0009](docs/adr/0009-modelo-remoto-sharepoint.md) |
| Sincronización | Push por "campos sucios" + pull incremental + merge a 3 vías | [0010](docs/adr/0010-sincronizacion-y-conflictos.md) |
| Fotos/PDF | JPEG ≤1920 px calidad 0.75 en cliente; PDF ≤20 MB; upload sessions | [0011](docs/adr/0011-imagenes-y-archivos.md) |
| Flujo de negocio | Máquina de estados por etapas (Excel) | [0012](docs/adr/0012-flujo-de-servicio-por-etapas.md) |
| Correos/alertas | Power Automate sobre la lista de SharePoint | [0013](docs/adr/0013-notificaciones-power-automate.md) |
| Hosting | Cloudflare Pages, despliegue manual con Wrangler | [0014](docs/adr/0014-hosting-cloudflare-pages-y-actualizacion.md) |
| Git | Ramas cortas `feature/`/`fix/`, Conventional Commits, SemVer, sin CI/CD | [0015](docs/adr/0015-branching-y-versionado.md) |

Lista completa en [docs/adr/README.md](docs/adr/README.md).

## Inicio rápido (cuando empiece la implementación)

1. Preparar el PC: [docs/05-Stack-y-Entorno-de-Desarrollo.md](docs/05-Stack-y-Entorno-de-Desarrollo.md).
2. Pedir al administrador del tenant la configuración de [docs/06-Configuracion-Tenant-M365.md](docs/06-Configuracion-Tenant-M365.md).
3. Implementar las specs en orden ([specs/README.md](specs/README.md) §3), empezando por `001-fundacion-pwa` (Fase 0).

## Fuente de requerimientos

- Excel de campos: `docs/referencias/CARACTERES Y OPCIONES PARA CARGADORES Y BATERIAS EN INSTALACIÓN DE EMPRESA (1).xlsx`.
- Guías de buenas prácticas: `docs/referencias/MejoresPracticasDesarrolloSoftwareYApis.md` y `docs/referencias/Ambientes/` (01, 02, 05, 07).
- Pantallas de referencia del diseño: `docs/diseno/referencia/`.

Todo lo necesario para implementar está dentro de esta carpeta: no depende de archivos externos.
