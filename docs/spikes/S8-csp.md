# S8 — CSP estricta (sin `unsafe-inline`) con la app real

> Spike S8 de `docs/07` §F0.10 · tarea T051 de la spec 001 · Fecha: 2026-11-16 · Ejecutado en Chromium (Playwright) contra el build `development`.

## Pregunta

¿Funciona la app con la CSP de `public/_headers` **tal cual** —`script-src 'self'`, `style-src 'self'` (sin `'unsafe-inline'`), `font-src 'self'`— con React Aria Components, CSS Modules, fuentes e íconos autoalojados, MSAL, el service worker y el procesamiento de fotos, **sin violaciones**?

## Método

`tests/e2e/csp.spec.ts` construye la app, la sirve con exactamente las cabeceras de `public/_headers` (solo se omiten `Strict-Transport-Security` y `upgrade-insecure-requests`, que no tienen sentido en `http://localhost`) y falla ante **cualquier** violación: evento `securitypolicyviolation`, error de consola «Content Security Policy» o error de página. Cada violación se etiqueta con el paso del recorrido en que ocurre.

Recorrido: configuración inicial (login simulado) → 10 pantallas principales → Ajustes (tamaño de fuente) → recepción completa con comboboxes, fechas y **foto** (canvas, `blob:`) → filtros (select con popover) → detalle → menú técnico (pestañas y 3 diálogos) → catálogo de componentes → `/instalar` y 404 → service worker y recarga **sin conexión**. Una segunda prueba usa un build con **MSAL real** (`VITE_AUTH_MODE=msal`) y comprueba que carga, se inicia y que el redirect a `login.microsoftonline.com` está permitido.

Reproducir: `npx playwright test tests/e2e/csp.spec.ts --project=chromium-desktop`.

## Resultado

La CSP **bloqueaba dos cosas en cada carga de página**. Ambas son de librerías, no de nuestro código, y ya están resueltas:

| #   | Directiva                 | Origen                    | Qué pasaba                                                                                                                                                       | Solución                                                                                                                                                                                                                                             |
| --- | ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `script-src` (eval)       | **zod 4**                 | Al primer uso prueba si puede compilar validadores con `new Function` (JIT). Lo captura con `try/catch`, pero el navegador registra la violación igualmente.     | `z.config({ jitless: true })` en `src/shared/zodSinEval.ts`, importado primero en `main.tsx`. La validación es la misma; solo se evita compilar.                                                                                                     |
| 2   | `style-src-elem` (inline) | **React Aria `usePress`** | Inyecta un `<style>` en línea (`@layer { [data-react-aria-pressable] { touch-action: pan-x pan-y pinch-zoom } }`) la primera vez que monta un elemento pulsable. | La librería **no inyecta si ya existe un elemento con id `react-aria-pressable-style`**. Se sirve la misma regla como archivo (`public/react-aria-pressable.css`) y se enlaza desde `index.html` con ese id. Sin `unsafe-inline`, sin hash ni nonce. |

Con ambas correcciones: **0 violaciones** en todo el recorrido y en el inicio con MSAL, y la CSP de producción **no cambia** (sigue sin `unsafe-inline` ni `unsafe-eval`).

### Lo que ya estaba bien (no producía violaciones)

- React Aria: popovers, diálogos/hojas modales, tabs, selects y comboboxes (el posicionamiento usa CSSOM, no atributos `style`, que sí se permiten).
- CSS Modules (hojas de estilo externas), fuentes Montserrat (`font-src 'self'`) e íconos SVG (componentes).
- Fotos: canvas y miniaturas con `blob:` (`img-src`).
- Service worker, precarga y recarga sin conexión.
- MSAL: carga diferida, inicio y navegación a Entra ID (`connect-src`, `frame-src`, `form-action`).

## Decisión

- Mantener la CSP de `_headers` sin cambios. No se necesita `'unsafe-inline'`, hashes ni nonces.
- El E2E `csp.spec.ts` queda como guarda de regresión: si una actualización de React Aria o zod vuelve a inyectar estilos o `eval`, la prueba falla y nombra la pantalla y el origen.
- **Al actualizar React Aria:** si cambia el `id` o el contenido de esa regla, el E2E lo detecta; ajustar `public/react-aria-pressable.css` y su id.

## Límites (no cubierto)

- **Cabeceras reales de Cloudflare Pages:** se simularon con un servidor local. Confirmar con `curl -I` en DEV (T043) que `_headers` se aplica a todas las rutas.
- **iframe oculto de MSAL (`acquireTokenSilent`/`ssoSilent`):** no se pudo ejercitar sin una cuenta real de Entra ID; `frame-src https://login.microsoftonline.com` está permitido. Verificar en el spike S1 (dispositivos reales).
- **Safari/iOS y Firefox:** solo se probó Chromium. La rama de iOS de `usePreventScroll` en React Aria inyecta otro `<style>` con `@layer`; si en iPhone aparece una violación, aplicar el mismo patrón (id existente) o registrar el hash. Verificar en el iPhone del spike S1/S5.
- **Worker de compresión:** la compresión de fotos corre hoy en el hilo principal con canvas; `worker-src 'self' blob:` está permitido pero no se ejercitó un worker.
