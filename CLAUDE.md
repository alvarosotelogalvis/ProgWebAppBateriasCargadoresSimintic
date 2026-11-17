# CLAUDE.md — Instrucciones para el agente de IA que implementa esta app

> Este archivo es el resumen operativo. La fuente de verdad de cada decisión es su ADR en `docs/adr/`. Si algo aquí contradice un ADR `Aceptado`, manda el ADR y se corrige este archivo.

## 1. Contexto en 6 líneas

- PWA **offline-first** para el ciclo de servicio de **baterías y cargadores** (campos definidos en el Excel del cliente; ver `docs/03-Modelo-de-Datos.md`).
- **No existe backend propio**. Todo corre en el navegador del dispositivo. El hosting (Cloudflare Pages) solo sirve archivos estáticos.
- Datos locales en **IndexedDB (Dexie)**, incluidos fotos y PDFs como `Blob`.
- Al sincronizar, el usuario confirma su sesión **Entra ID (MSAL.js, flujo SPA + PKCE, permisos delegados)** y la app escribe en **SharePoint Online vía Microsoft Graph**.
- Dispositivos **no administrados** (sin Intune): Android, iOS/iPadOS, Windows, macOS.
- Un único desarrollador. Ramas cortas, commits frecuentes, **sin CI/CD** (calidad garantizada con hooks locales + `npm run verify`).

## 2. Orden de lectura obligatorio antes de escribir código

1. `README.md` y `.specify/memory/constitution.md` (principios no negociables)
2. `docs/01-PRD.md` (en especial §12 Preguntas abiertas)
3. `docs/02-SDD.md`
4. `docs/03-Modelo-de-Datos.md` y `docs/10-Sistema-de-Diseno.md` (estilo visual y adaptación por dispositivo)
5. `docs/adr/README.md` y los ADR que toque la tarea
6. `specs/README.md` y la carpeta de la spec en curso: `spec.md` → `plan.md` → `tasks.md` (y `docs/07-Plan-de-Implementacion.md` para el contexto de la fase)
7. Guías base del usuario (copiadas dentro del proyecto): `docs/referencias/Ambientes/01-Comun-Transversal.md`, `02-App-Web.md`, `05-App-Movil.md`, `07-ADR-Decisiones-Arquitectura.md`, y el documento base `docs/referencias/MejoresPracticasDesarrolloSoftwareYApis.md`. El Excel original de campos está en `docs/referencias/` y las pantallas de referencia del diseño en `docs/diseno/referencia/`.

## 3. Reglas no negociables

1. **Nunca perder datos locales.** Ninguna migración, limpieza, logout ni actualización puede borrar un registro o archivo con `syncState !== 'synced'`. Toda purga verifica esto y tiene prueba unitaria.
2. **Sin secretos en el cliente.** Solo `clientId` y `tenantId` (públicos). Prohibido usar client secret o certificado. Prohibido el flujo de credenciales de cliente (client credentials).
3. **Offline primero.** Toda pantalla funciona sin red con los datos locales. La red solo se usa en: configuración inicial, sincronización, consulta de adjuntos remotos y actualización de la app.
4. **Capas respetadas** (ADR-0004): `domain/` no importa React, Dexie, MSAL ni `fetch`; `application/` solo depende de `domain/` y de puertos (interfaces); todo acceso a Graph vive en `infrastructure/graph/`. Se hace cumplir con reglas de ESLint.
5. **Idempotencia en la sincronización**: el `id` (UUID v4) del servicio se genera en el dispositivo y es `ServicioId` (único) en SharePoint. Los nombres de archivo son deterministas. Reintentar nunca duplica.
6. **Textos de UI externalizados** en `src/locales/es-CO/*.json` (i18next). Prohibido escribir strings de UI directamente en los componentes.
7. **Accesibilidad WCAG 2.2 AA** y mobile-first en todo componente nuevo.
8. **Seguridad del frontend**: sin `dangerouslySetInnerHTML`, CSP estricta (`public/_headers`), sin scripts de terceros en tiempo de ejecución, sin analítica externa.
9. **El modo de autenticación simulada (`VITE_AUTH_MODE=mock`) es solo para pruebas.** El build de producción debe fallar si está activo (ver SDD §8.6).
10. **Decisiones**: si una tarea exige una decisión de arquitectura no cubierta por un ADR, **pregunta al usuario**, crea el ADR y actualiza el índice y este archivo. Nunca edites la decisión de un ADR `Aceptado`: crea uno nuevo que lo reemplace.

## 3.1 Cómo trabajar (Spec-Driven Development)

1. Toma la siguiente spec del índice (`specs/README.md` §3) cuyas dependencias estén `Implementada`.
2. **Clarify**: resuelve con el usuario las marcas `[NECESITA ACLARACIÓN]` de su `spec.md` (o confirma el valor por defecto). Anota las respuestas en §8 "Aclaraciones" y pasa la spec a `Aprobada`.
3. Revisa el `plan.md`: si los spikes o las aclaraciones cambiaron algo, actualiza el plan (y crea un ADR si es una decisión de arquitectura) **antes** de codificar.
4. Ejecuta `tasks.md` en orden, marcando `[x]` cada tarea terminada y haciendo un commit por tarea (`feat(NNN): T### …`). Las pruebas van antes que el código (constitución, Art. VII).
5. Al final: escenarios ES de la spec verificados + DoD → spec `Implementada`.
6. No implementes nada que no esté en una spec. Si falta algo, propón agregarlo a la spec (o a una nueva) y pide aprobación.

## 4. Estado de los ADR y cómo tratarlos

- `Aceptado`: decisión del usuario o confirmada en conversación. Se implementa tal cual.
- `Propuesto`: diseño recomendado por el agente de diseño. **Es la línea base a implementar**, pero antes de la fase indicada en `docs/07` confirma con el usuario las preguntas abiertas asociadas (PRD §12). Si el usuario confirma, cambia el estado a `Aceptado`. Si cambia algo, crea un ADR nuevo que reemplace al anterior.

## 5. Decisiones vigentes (resumen)

| Tema                    | Decisión                                                                                                                                                                                                                                                                                                           | ADR  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| Registro de decisiones  | ADR en `docs/adr/`                                                                                                                                                                                                                                                                                                 | 0001 |
| Tipo de app             | PWA instalable, offline-first, sin backend                                                                                                                                                                                                                                                                         | 0002 |
| Stack                   | TypeScript estricto, React 19, Vite, vite-plugin-pwa (UI: ver fila "UI")                                                                                                                                                                                                                                           | 0003 |
| Arquitectura            | SPA CSR, features + capas tipo hexagonal liviana                                                                                                                                                                                                                                                                   | 0004 |
| Estado                  | Dexie `useLiveQuery` (datos persistentes) + Zustand (sesión, UI, progreso de sync)                                                                                                                                                                                                                                 | 0005 |
| Login                   | MSAL.js, `loginRedirect`, confirmación explícita antes de sincronizar, app roles                                                                                                                                                                                                                                   | 0006 |
| Permisos Graph          | `Sites.Selected` delegado (+ `User.Read`, `offline_access`, `openid`, `profile`)                                                                                                                                                                                                                                   | 0007 |
| Persistencia local      | IndexedDB con Dexie 4; `navigator.storage.persist()`                                                                                                                                                                                                                                                               | 0008 |
| Remoto                  | Listas `Servicios`, `Clientes`, `Marcas`, `ConfiguracionApp`, `LogSincronizacion` + biblioteca `ServiciosAdjuntos`                                                                                                                                                                                                 | 0009 |
| Sync                    | Por estado (campos sucios), push → pull, merge a 3 vías, Web Locks, backoff                                                                                                                                                                                                                                        | 0010 |
| Archivos                | JPEG ≤1920 px q=0.75 en Web Worker, miniatura 320 px, PDF ≤20 MB, upload session >4 MB                                                                                                                                                                                                                             | 0011 |
| Negocio                 | Máquina de estados `BORRADOR → RECIBIDO → DIAGNOSTICADO → COTIZADO → EN_REPARACION → ENTREGADO → FACTURADO` / `DISPOSICION_FINAL` / `ANULADO`                                                                                                                                                                      | 0012 |
| Correos y alertas       | Power Automate (correo de OT, alertas de vida útil)                                                                                                                                                                                                                                                                | 0013 |
| Hosting y actualización | Cloudflare Pages, `wrangler pages deploy`, actualización del SW con aviso                                                                                                                                                                                                                                          | 0014 |
| Git                     | Ramas cortas, Conventional Commits, SemVer, hooks locales, sin CI/CD                                                                                                                                                                                                                                               | 0015 |
| Metodología             | Kanban personal con DoR/DoD                                                                                                                                                                                                                                                                                        | 0016 |
| Observabilidad          | Logs locales en anillo + lista `LogSincronizacion` + `client-request-id`                                                                                                                                                                                                                                           | 0017 |
| Seguridad local         | Sin cifrado propio de IndexedDB; caché MSAL en `localStorage`; riesgo aceptado con mitigaciones                                                                                                                                                                                                                    | 0018 |
| UI                      | **Sistema de diseño propio** según las pantallas de referencia (`docs/10`, `docs/diseno/referencia/`): tokens CSS (ajustados a AA), CSS Modules, React Aria Components, Montserrat y Material Symbols autoalojados, mobile-first con 3 breakpoints, solo tema claro, tamaño de fuente configurable, es-CO, sin SEO | 0022 |
| Clientes                | Se pueden crear desde el formulario (permanentes, idempotentes por `ClienteGuid`/nombre normalizado) y el Administrador puede fusionar dos clientes                                                                                                                                                                | 0023 |
| Ambientes               | DEV y PRD (sitio SharePoint y App Registration separados)                                                                                                                                                                                                                                                          | 0020 |
| Proceso                 | Spec-Driven Development: constitución + `specs/NNN/{spec,plan,tasks}.md`                                                                                                                                                                                                                                           | 0021 |

## 6. Comandos (los crea la Fase 0)

```bash
npm run dev            # Vite en http://localhost:5173
npm run build          # build de producción (mode production)
npm run build:dev      # build contra el ambiente DEV
npm run preview        # sirve dist/ para probar el service worker
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (unit + integración)
npm run test:e2e       # Playwright
npm run verify         # lint + typecheck + test (obligatorio antes de merge a main)
npm run deploy:dev     # wrangler pages deploy (rama dev)
npm run deploy:prod    # wrangler pages deploy (rama main / producción)
```

## 7. Estructura de carpetas objetivo

Ver `docs/02-SDD.md` §4.2. Resumen:

```
src/app  src/domain  src/application  src/infrastructure/{db,graph,auth,media,pwa,logging}
src/features/{servicios,adjuntos,sincronizacion,auth,alertas,configuracion,tecnico,ayuda,instalacion}
src/shared  src/locales/es-CO  tests/e2e  public/
```

## 8. Flujo de trabajo con git (ADR-0015)

- Rama por tarea desde `main`: `feature/F3-formulario-recepcion`, `fix/sync-reintento-429`, `docs/...`, `chore/...`.
- Commits pequeños y frecuentes en formato **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), en español.
- Antes de hacer merge a `main`: `npm run verify` en verde y la Definition of Done de la tarea cumplida. Merge con `--no-ff` o squash.
- Hooks locales: `pre-commit` (lint-staged) y `commit-msg` (commitlint). No los saltes con `--no-verify`.

## 9. Definition of Done (por tarea)

- [ ] Criterios de aceptación de la tarea (`docs/07`) cumplidos.
- [ ] Pruebas unitarias y de integración nuevas en verde. Cobertura de `domain/` y `application/` ≥ 90 %.
- [ ] `npm run verify` en verde.
- [ ] Funciona sin conexión (probado con DevTools → Offline) si la tarea toca UI o datos.
- [ ] Textos en i18n, sin errores de accesibilidad de axe en las pantallas tocadas.
- [ ] Documentación actualizada (SDD, modelo de datos, ayuda in-app si cambia el uso) y ADR si hubo decisión.
- [ ] `CHANGELOG.md` actualizado en la sección `Unreleased`.

## 10. Lo que NO debes hacer

- No agregar un backend, Azure Functions ni proxies. Si algo parece requerirlo, detente y pregunta.
- No usar `localStorage` para datos de negocio (solo para el caché de MSAL y preferencias triviales).
- No usar `window.alert/confirm`; usa `Sheet`/`Dialog` de `src/shared/ui`.
- No importar `@fluentui/*`, MUI ni otras librerías de UI. No usar colores, radios ni sombras literales fuera de `tokens.css`. No cargar fuentes ni íconos desde un CDN.
- Antes de crear una pantalla, mira su referencia en `docs/10-Sistema-de-Diseno.md` §6 y la imagen correspondiente en `docs/diseno/referencia/`. Revísala en 360, 768 y 1280 px.
- No descargar todos los adjuntos remotos automáticamente (solo miniaturas, según configuración).
- No asumir los valores de catálogos pendientes (Diagnóstico, etc.): se leen de las columnas Choice de SharePoint.
