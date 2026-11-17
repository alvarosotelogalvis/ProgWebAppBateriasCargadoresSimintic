# ADR-0005 — Gestión de estado: Dexie `liveQuery` para datos + Zustand para sesión y UI

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `02-App-Web.md` §2 y §3.2 (estado local vs. global, sin estado duplicado)

## Contexto

La fuente de verdad en el dispositivo es IndexedDB. Si además se copian los datos a un store global (Redux) o a una caché de servidor (TanStack Query), aparece estado duplicado y desincronizado. La red no es la fuente de los datos de pantalla: lo es la base local.

## Opciones consideradas

1. **Redux Toolkit + persistencia**. Contras: duplica IndexedDB y el boilerplate es alto.
2. **TanStack Query sobre Graph**. Contras: está pensado para "el servidor es la verdad", lo opuesto a offline-first.
3. **Dexie `useLiveQuery` (datos) + Zustand (estado efímero)**. Pros: la UI reacciona sola a cualquier escritura local (incluida la del motor de sync) sin duplicar datos. Zustand queda para lo que no es persistente.

## Decisión

- **Datos de negocio** (servicios, adjuntos, catálogos): se leen solo con hooks `useLiveQuery` de `infrastructure/db/hooks`. Se escriben solo a través de los casos de uso de `application/`.
- **Zustand** solo para: la sesión en memoria (cuenta y roles), el progreso y los eventos del `SyncEngine`, el estado de conexión, el `beforeinstallprompt` guardado y los toasts.
- **Estado de formulario**: `react-hook-form` (local al componente) con autoguardado en Dexie.
- **Preferencias** (fuente, tema): Zustand con `persist` en `localStorage` (no son datos de negocio).

## Consecuencias

- **Positivas**: una sola fuente de verdad; el sync actualiza la UI automáticamente.
- **Negativas**: las consultas complejas se arman a mano sobre Dexie.

## Cumplimiento / verificación

Revisión: ningún store de Zustand guarda `Servicio` ni `Adjunto`.

## Referencias

- SDD §6, §12
