# ADR-0004 — Arquitectura: SPA (CSR) modular por features con capas tipo hexagonal liviana

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude (agente de diseño); pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `01-Comun` §1 (patrón), `02-App-Web.md` §2 (renderizado, organización del código), doc. base §6.2

## Contexto
La app no tiene servidor, no necesita SEO y debe funcionar offline. La lógica de negocio (máquina de estados, merge, validaciones) es crítica y debe ser **testeable sin navegador**. La integración con Graph podría cambiar (delta vs. filtro, If-Match) según los spikes.

## Opciones consideradas
1. **Renderizado**: SPA/CSR. SSR/SSG no aplican (sin servidor ni SEO, requieren el app shell offline). → **CSR**.
2. **Organización por tipo de archivo** (`components/`, `services/`). Contras: mezcla dominios y escala mal.
3. **Por features + capas** (`domain` / `application` / `infrastructure` / `features`). Pros: dominio puro testeable, adaptadores intercambiables (mock auth, Graph simulado). Contras: algo más de estructura inicial.
4. **Clean Architecture completa** con DI de un framework. Contras: excesiva para un solo desarrollador.

## Decisión
- **SPA con CSR**, monolito modular en el cliente.
- Estructura de `docs/02-SDD.md` §4.2: `domain/` puro, `application/` con casos de uso y **puertos**, `infrastructure/` con adaptadores (Dexie, Graph, MSAL, media, PWA, logging) y `features/` con la UI por funcionalidad.
- Composición manual de dependencias en `src/app/container.ts` (sin framework de DI).
- Reglas de importación entre capas forzadas con ESLint (`eslint-plugin-boundaries`).

## Consecuencias
- **Positivas**: lo crítico (estados, merge, sync) se prueba con Vitest sin UI; se puede cambiar el adaptador de Graph sin tocar el dominio.
- **Negativas**: más archivos e interfaces.
- **Riesgos**: el agente salta las capas por atajo → lo detiene la regla de lint, que hace fallar `verify`.

## Cumplimiento / verificación
`npm run lint` con boundaries. Revisión: ningún `fetch`, `Dexie` ni `msal` fuera de `infrastructure/`.

## Referencias
- SDD §4
