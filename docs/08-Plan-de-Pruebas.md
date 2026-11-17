# Plan de pruebas

> Guía base §14 (unitarias, integración, E2E, carga, seguridad) adaptada a una PWA sin backend. Herramientas: ADR-0003. Diseño: SDD §18.

## 1. Niveles y herramientas

| Nivel                  | Herramienta                                                                      | Qué cubre                                                                            | Dónde                        |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| Unitarias              | Vitest                                                                           | `domain/*`, mappers, backoff, utilidades de formato                                  | `src/**/*.test.ts`           |
| Integración            | Vitest + `fake-indexeddb` + MSW                                                  | Repositorios Dexie, migraciones, casos de uso, `SyncEngine` contra un Graph simulado | `src/**/*.int.test.ts`       |
| Componentes            | Vitest + Testing Library + jsdom                                                 | Formularios por etapa, Galería, pantalla de Sync, Resolver conflicto                 | `src/features/**/*.test.tsx` |
| E2E                    | Playwright (auth mock + `page.route` para Graph)                                 | Flujos completos, offline/online, instalación (manifest/SW)                          | `tests/e2e/*.spec.ts`        |
| Accesibilidad          | `@axe-core/playwright`                                                           | Pantallas principales                                                                | `tests/e2e/a11y.spec.ts`     |
| Rendimiento            | Lighthouse (DevTools o `npx lighthouse`), `rollup-plugin-visualizer`             | Presupuestos de RNF-04 y RNF-06                                                      | Manual antes del release     |
| Seguridad              | `npm audit`, revisión de CSP (consola sin violaciones), revisión de dependencias | RNF-10                                                                               | Antes del release            |
| Carga / volumen        | Script de seed (500 servicios, 3 GB de blobs simulados)                          | RNF-07, fluidez de las listas, duración del sync                                     | Manual en F10                |
| Manual en dispositivos | Matriz §5                                                                        | Instalación, cámara, login redirect, persistencia                                    | F0 (spikes) y F10            |

**Coberturas mínimas**: `domain/` y `application/` ≥ 90 % (máquina de estados al 100 %). Global ≥ 70 %. Vitest falla si no se alcanzan (`coverage.thresholds`).

## 2. Casos críticos (deben existir como pruebas automáticas)

| ID   | Caso                                                                                                                                                                                                                                            | Nivel  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T-01 | Cada transición de `TRANSICIONES`: válida, falta requisito y rol incorrecto                                                                                                                                                                     | Unit   |
| T-02 | Normalización y regex de serie, referencia y marca; el número de solicitud no se captura y `0` significa pendiente                                                                                                                              | Unit   |
| T-03 | Merge a 3 vías: los 4 casos de la tabla del SDD §9.5 + la regla especial de `estado`                                                                                                                                                            | Unit   |
| T-04 | Nivel de alerta por días y umbrales configurables                                                                                                                                                                                               | Unit   |
| T-05 | Mappers ida y vuelta, incluidas las fechas de solo fecha y los Choice desconocidos                                                                                                                                                              | Unit   |
| T-06 | `actualizarCampos` acumula `camposSucios` sin duplicados y pone `syncState=pending`                                                                                                                                                             | Int    |
| T-07 | Migración de Dexie v1→v2 (cuando exista) conserva pendientes                                                                                                                                                                                    | Int    |
| T-08 | Purga: nunca elimina servicios ni blobs con `syncState ≠ synced`                                                                                                                                                                                | Int    |
| T-09 | Sync push feliz: crea el ítem, sube N archivos, PATCH de los campos sucios, log                                                                                                                                                                 | Int    |
| T-10 | Red caída a mitad de la subida de un archivo → reintento sin duplicar (mismo nombre, `replace`)                                                                                                                                                 | Int    |
| T-11 | Upload session reanudada desde `siguienteByte`; sesión expirada → nueva                                                                                                                                                                         | Int    |
| T-12 | `POST` responde un conflicto de valor único → buscar por `ServicioId` y continuar                                                                                                                                                               | Int    |
| T-13 | 429 con `Retry-After` → espera y reintento; 8 fallos → error manual                                                                                                                                                                             | Int    |
| T-14 | 401 → silent → redirect pedido; 403 → error no reintentable con mensaje                                                                                                                                                                         | Int    |
| T-15 | 412 → merge → sin choque se reintenta el PATCH; con choque queda `conflict`                                                                                                                                                                     | Int    |
| T-16 | Pull: servicio remoto nuevo insertado; remoto modificado sin cambios locales sobrescribe                                                                                                                                                        | Int    |
| T-17 | Dos syncs simultáneos (Web Locks) → solo uno corre                                                                                                                                                                                              | Int    |
| T-18 | Build de producción con `VITE_AUTH_MODE=mock` falla                                                                                                                                                                                             | Script |
| T-19 | E2E: configuración inicial → offline → recepción con 3 fotos → recarga → datos presentes                                                                                                                                                        | E2E    |
| T-20 | E2E: offline → online → aviso → confirmar → sync OK → badges ✓                                                                                                                                                                                  | E2E    |
| T-21 | E2E: ciclo completo por roles hasta FACTURADO; rama DF; anulación                                                                                                                                                                               | E2E    |
| T-22 | E2E: pantalla Instalar en webkit-mobile no standalone bloquea el formulario                                                                                                                                                                     | E2E    |
| T-23 | E2E: nueva versión del SW mientras hay un formulario con cambios → espera; sin cambios → recarga                                                                                                                                                | E2E    |
| T-24 | E2E: exportar respaldo genera un ZIP con `servicios.json` y los adjuntos pendientes                                                                                                                                                             | E2E    |
| T-25 | a11y: Inicio, Servicios, Detalle, Recepción, Sync, Ajustes sin violaciones `serious`/`critical`, **en 360, 768 y 1280 px**                                                                                                                      | E2E    |
| T-26 | Regresión visual: capturas de Inicio, Servicios (lista y detalle), Recepción, Sync, Alertas y Filtros en 360×740, 768×1024 y 1280×800, comparadas contra la línea base aprobada (estilo de `docs/10`). Sin scroll horizontal en ningún viewport | E2E    |

## 3. Simulación de Graph

- **MSW** (integración): handlers en `tests/fixtures/graph/handlers.ts` que emulan las listas y el drive en memoria, con modos de error inyectables (`failNext(429)`, `dropConnectionAfter(bytes)`, `etagMismatch()`).
- **Playwright**: `page.route('https://graph.microsoft.com/**', …)` reutilizando el mismo emulador en memoria (módulo compartido) y `context.setOffline(true|false)` para la conectividad.

## 4. Datos de prueba

- `tests/fixtures/img/` con fotos de ejemplo: 12 MP JPEG, PNG, HEIC (para el error controlado) y una foto girada por EXIF.
- `tests/fixtures/pdf/` con un PDF válido de 200 KB, un PDF de 25 MB (excede el límite) y un `.pdf` falso (texto).
- Seed `scripts/seed-dev.ts` con clientes y marcas de prueba y 500 servicios en estados variados (solo modo dev).

## 5. Matriz de pruebas manuales en dispositivos (F0 spikes y F10)

| #    | Escenario                                                 | Android Chrome (celular) | Android tablet | iPhone Safari (instalada) | iPad | Windows Edge (instalada) | macOS Chrome |
| ---- | --------------------------------------------------------- | ------------------------ | -------------- | ------------------------- | ---- | ------------------------ | ------------ |
| M-01 | Instalar desde el navegador e ícono creado                |                          |                |                           |      |                          |              |
| M-02 | Abrir sin red tras instalar                               |                          |                |                           |      |                          |              |
| M-03 | Login redirect en la app instalada                        |                          |                |                           |      |                          |              |
| M-04 | Sesión persiste tras cerrar y reabrir                     |                          |                |                           |      |                          |              |
| M-05 | Foto con cámara trasera, orientación correcta             |                          |                |                           |      | — (webcam)               | — (webcam)   |
| M-06 | Elegir 5 fotos de la galería; tiempo de compresión        |                          |                |                           |      |                          |              |
| M-07 | Adjuntar PDF desde Archivos / Drive                       |                          |                |                           |      |                          |              |
| M-08 | Recepción completa en modo avión                          |                          |                |                           |      |                          |              |
| M-09 | Sync al volver la red; aviso y confirmación               |                          |                |                           |      |                          |              |
| M-10 | Cortar la red durante el sync; reintento sin duplicar     |                          |                |                           |      |                          |              |
| M-11 | Datos persisten tras 8 días sin abrir (iOS)               | —                        | —              |                           |      | —                        | —            |
| M-12 | Actualización de versión con aviso                        |                          |                |                           |      |                          |              |
| M-13 | Tamaño de fuente "Muy grande" sin cortes                  |                          |                |                           |      |                          |              |
| M-14 | Lector de pantalla (TalkBack / VoiceOver) en la recepción |                          |                |                           |      |                          |              |

Registrar el resultado (✓ / ✗ + nota + versión de SO y navegador) en `docs/pruebas/matriz-AAAA-MM-DD.md`.

## 6. Criterios de salida del release

- 100 % de T-01…T-26 en verde. Coberturas cumplidas.
- Matriz M-01…M-14 sin ✗ en Android Chrome, iPhone Safari y Windows Edge (plataformas principales).
- Lighthouse ≥ 90 / bundle ≤ 350 KB / axe sin violaciones serias / `npm audit` limpio.
- Piloto de 1 semana sin pérdida de datos y con ≥ 98 % de syncs OK (`LogSincronizacion`).
