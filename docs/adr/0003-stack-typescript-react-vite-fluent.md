# ADR-0003 — Stack: TypeScript + React + Vite + Fluent UI v9

- **Estado**: Aceptado — **la parte de librería de UI (Fluent UI v9) fue reemplazada por [ADR-0022](0022-sistema-de-diseno-propio.md)**. El resto del stack sigue vigente.
- **Fecha**: 2026-10-21
- **Fecha de cambio de estado**: 2026-10-21 (reemplazo parcial)
- **Decisores**: Álvaro Sotelo (stack aceptado en conversación); librerías de detalle propuestas por Claude
- **Origen en la guía**: `01-Comun` §1, `02-App-Web.md` §2 (framework, build), ADR mínimo 0002 transversal

## Contexto
Se necesita un stack web con buen soporte de PWA, de MSAL (Entra ID), de IndexedDB y de componentes accesibles, apto para que un agente de IA lo implemente con abundante documentación pública.

## Opciones consideradas
1. **React + Vite + TypeScript**. Pros: `@azure/msal-react` oficial, `vite-plugin-pwa` maduro, el ecosistema más grande. Contras: hay que elegir librerías complementarias.
2. **Angular**. Pros: todo incluido, `@azure/msal-angular`. Contras: más pesado y con más ceremonia para un solo desarrollador.
3. **Vue / Svelte**. Pros: livianos. Contras: MSAL sin wrapper oficial y menos ejemplos con Fluent/M365.
4. **Blazor WebAssembly**. Contras: arranque y peso altos para dispositivos de gama baja; la PWA offline con Blobs es más compleja.

Librería de UI:
- **Fluent UI React v9**. Pros: aspecto M365, accesible, responsive. Contras: bundle mediano y CSS-in-JS (requiere `style-src 'unsafe-inline'`).
- Tailwind + shadcn/ui. Pros: liviano. Contras: hay que construir la accesibilidad y la coherencia visual con M365.

## Decisión
- **TypeScript** (strict) + **React 19** + **Vite** + **Fluent UI React v9**.
- Complementos: `vite-plugin-pwa` (Workbox), `dexie` + `dexie-react-hooks`, `zustand`, `react-hook-form` + `zod`, `react-router` 7, `@azure/msal-browser` + `@azure/msal-react`, `browser-image-compression`, `fflate`, `@tanstack/react-virtual`, `i18next`, `date-fns`.
- Pruebas: Vitest, Testing Library, fake-indexeddb, MSW, Playwright y axe.
- Calidad: ESLint (flat), Prettier, husky, lint-staged y commitlint.
- Se instala la última versión estable de cada paquete al implementar (mínimos en `docs/05` §1.2).

## Consecuencias
- **Positivas**: documentación abundante e integración natural con M365.
- **Negativas**: Fluent aumenta el bundle. Se mitiga con lazy loading e imports de íconos individuales (presupuesto de 350 KB gzip).
- **Riesgos**: majors nuevos de MSAL o Dexie que cambian la API → revisar las guías de migración en la Fase 0.

## Cumplimiento / verificación
`package.json` y `package-lock.json` revisados en la Fase 0. Tabla de versiones instaladas en `docs/05` §16.

## Referencias
- `docs/05-Stack-y-Entorno-de-Desarrollo.md`
