# F10 — Rendimiento y preparación de release

**Fecha**: 2026-11-15 · **Medido sobre**: `vite build --mode development` servido con `vite preview` (Chromium 1248 de Playwright, Lighthouse 12.6.1, preset móvil por defecto: 4G lenta simulada + CPU 4× más lenta).

## F10.2 — Medición actualizada (2026-11-17)

> Esta sección **sustituye** los números de la medición del 15/11 (más abajo), que se hicieron con `vite preview` sin compresión y con ±15 puntos de ruido.

**Método (más cercano a producción):** build `--mode production` (MSAL, identificadores de relleno), servido por un servidor estático con **brotli/gzip y las cabeceras reales de `public/_headers`** (sin HSTS ni `upgrade-insecure-requests`, que exigen https), assets con `immutable`. Lighthouse 12.8.2, Chrome local sin interfaz, preset móvil por defecto (4G lenta simulada + CPU 4× más lenta), **3 corridas por página y mediana**. Las pantallas internas usan el build con autenticación simulada, con la sesión preparada antes (Lighthouse sin borrar el almacenamiento).

### Resultados

| Página                                                    |     Rendimiento     | Accesibilidad | Buenas prácticas |    FCP |    LCP |    TBT |   CLS |
| --------------------------------------------------------- | :-----------------: | :-----------: | :--------------: | -----: | -----: | -----: | ----: |
| **Primera carga en frío** (`/configuracion-inicial`, PRD) | **83** (83, 83, 82) |      100      |       100        |  2,4 s |  3,7 s |  85 ms |     0 |
| Pantalla de instalación (PRD, en frío)                    | **82** (82, 82, 82) |      100      |       100        |  2,7 s |  3,8 s |  85 ms | 0,001 |
| Inicio, con la app ya cargada                             |  99 (89, 100, 99)   |      100      |       100        | 0,06 s | 0,24 s | 102 ms |     0 |
| Lista de servicios, con la app ya cargada                 |   98 (98, 98, 98)   |      100      |       100        | 0,06 s | 0,29 s | 154 ms |     0 |
| Menú Más, con la app ya cargada                           |  99 (100, 99, 99)   |      100      |       100        | 0,06 s | 0,22 s | 107 ms |     0 |

**Conclusión:** accesibilidad y buenas prácticas cumplen (100) en todas. El rendimiento cumple (≥ 90) en el uso normal —con la app ya instalada y precacheada por el service worker— y **no cumple en la primera carga en frío (82–83)**, que ocurre una vez por dispositivo.

### Bundle (gzip nivel 9 / brotli)

| Medida                                                                           |       gzip |  brotli | Meta          |        Estado        |
| -------------------------------------------------------------------------------- | ---------: | ------: | ------------- | :------------------: |
| Carga inicial referenciada en `index.html` (JS + CSS)                            |     271 KB |  232 KB | ≤ 350 KB gzip |          ✅          |
| + chunk de MSAL (se descarga en paralelo en PRD)                                 | **333 KB** | ~290 KB | ≤ 350 KB gzip | ✅ (margen de 17 KB) |
| Todo lo que precachea el service worker (JS 465 KB + CSS 24 KB + fuentes 853 KB) |    ~1,3 MB |       — | —             |     informativo      |

### Por qué la carga en frío no llega a 90

En la traza, todas las peticiones empiezan a los ~40 ms y terminan a los ~2,4 s: el bundle principal (227 KB brotli) comparte el ancho de banda simulado (1,6 Mbps) con el CSS que bloquea el pintado, y de ellos depende el FCP (2,4 s). El LCP (3,7–3,9 s) es el párrafo de la primera pantalla, que aparece cuando termina de ejecutarse el JS y llega el chunk de la ruta. Lighthouse marca **138 KB de los 226 KB del bundle principal como no usados** al arrancar.

Contenido del chunk de entrada (831 KB sin comprimir, atribuido por _source map_):

| Paquete                                           |  KB |    % |
| ------------------------------------------------- | --: | ---: |
| react-dom                                         | 204 | 24,8 |
| dexie                                             |  95 | 11,6 |
| react-router                                      |  91 | 11,1 |
| i18next                                           |  85 | 10,3 |
| zod                                               |  85 | 10,3 |
| íconos `@material-symbols/svg-500` (todos juntos) |  70 |  8,5 |
| react-aria                                        |  37 |  4,5 |
| `infrastructure/graph` + `application/sync`       |  42 |  5,1 |

### Opciones (requieren decisión: tocan el arranque)

| Opción                                                                                                                      | Ahorro estimado (sin comprimir) | Esfuerzo / riesgo                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------: | -------------------------------------------------------------- |
| **A. Aceptar** la carga en frío (83) y acotar el criterio F10.2 a la app ya instalada (98–99)                               |                               — | Ninguno. Es una decisión de producto.                          |
| B1. Quitar zod del arranque (`zod/mini` o validar el entorno a mano)                                                        |                          ~85 KB | Medio: `env.ts`, `domain/config.ts` y `domain/validaciones.ts` |
| B2. Cargar la sincronización (`infrastructure/graph`, `application/sync`) bajo demanda                                      |                          ~42 KB | Medio: el contenedor la crea al inicio                         |
| B3. Íconos bajo demanda en vez de todos en el bundle de entrada                                                             |                          ~70 KB | Bajo–medio: puede causar parpadeo                              |
| B4. Sustituir `react-aria-pressable.css` por un `<meta id="react-aria-pressable-style">` y llevar la regla al CSS principal |     1 petición bloqueante menos | Bajo                                                           |
| C. Medir en **DEV real** (Cloudflare Pages: HTTP/3, brotli, caché de borde) antes de decidir                                |                               — | Lo haces tú (T073)                                             |

Estimación honesta: B1+B2+B3 quitarían ~200 KB sin comprimir (~50–60 KB gzip, ~−22 %) y podrían subir la carga en frío unos 3–6 puntos (≈ 86–89). **No está garantizado llegar a 90.** Recomendación: hacer C primero; si en DEV real la carga en frío sigue por debajo de 90, decidir entre A y B.

### Cómo repetir la medición en DEV (T073)

```bash
npx lighthouse https://<url-dev>/configuracion-inicial --form-factor=mobile --only-categories=performance,accessibility,best-practices --output=html --output-path=./lh-dev.html
```

Hazlo 3 veces y quédate con la mediana; ejecútalo con Chrome en una ventana de incógnito y sin otras pestañas pesadas (la nota varía ±2 puntos en condiciones estables). Para las pantallas internas (Inicio, Servicios) mide en DevTools → Lighthouse **sin** «Clear storage», con la sesión iniciada.

---

## F10.2 — Bundle y Lighthouse

| Medida                                                       | Resultado                          | Meta     | Estado                    |
| ------------------------------------------------------------ | ---------------------------------- | -------- | ------------------------- |
| Bundle inicial (`index-*.js`)                                | 333 KB gzip (1,1 MB sin comprimir) | ≤ 350 KB | ✅ (margen de solo 17 KB) |
| Accesibilidad                                                | 100                                | ≥ 90     | ✅                        |
| Buenas prácticas                                             | 100                                | ≥ 90     | ✅                        |
| Rendimiento (simulado móvil)                                 | 62–67 (antes 55)                   | ≥ 90     | ❌                        |
| Rendimiento sin limitación de red/CPU                        | 99                                 | —        | —                         |
| Rendimiento con CPU 4× real (`--throttling-method=devtools`) | 37                                 | —        | —                         |

**Qué se mejoró**: pantalla de arranque estática en `index.html` (se pinta antes de que cargue el JS), `registerSW.js` con `defer` (ya no bloquea el render) y el ícono `favicon` (había un 404 en consola). TBT bajó de 760 a ~410–620 ms.

**Por qué no llega a 90**: el costo es la ejecución del JS de arranque en un CPU lento (TBT, LCP). El 65 % del bundle inicial no se usa en la primera pantalla. Composición aproximada del código fuente en el chunk principal: react-dom 620 KB, `@azure/msal-browser` + `msal-common` 770 KB, react-router 400 KB, zod 360 KB, react-aria 200 KB, dexie 94 KB, i18next 87 KB.

**Qué falta para llegar a 90** (requiere decisión, toca el arranque de autenticación):

1. Cargar MSAL bajo demanda (chunk aparte) y no bloquear el primer render con `prepararAutenticacion()`. Es lo que más pesa.
2. Reemplazar zod por `zod/mini` o validar el entorno sin zod en el arranque.
3. Cargar los idiomas/namespaces de i18n por ruta.

Medir de nuevo contra la URL de DEV real (esta medición fue local y sin HTTP/2 ni CDN, lo que suele mejorar la carga real).

## F10.6 — Configuración de producción

- `.env.production.example`: plantilla con `VITE_AUTH_MODE=msal`. Copiar a `.env.production` (ignorado por git).
- `vite build --mode production` falla si `VITE_AUTH_MODE=mock` **o** si falta/está en placeholder cualquiera de `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, `VITE_SHAREPOINT_SITE_URL`, `VITE_SHAREPOINT_SITE_NAME`.
- `.versionrc.json`: `npm run release` crea el commit y el tag `vX.Y.Z` sin reescribir `CHANGELOG.md` (está redactado a mano): antes de ejecutarlo, renombrar `[Unreleased]` a la versión.

## Hallazgos corregidos durante F10

- **Faltaban los íconos de la PWA** (`public/icons/`, T022 de la spec 001 sin hacer): el manifest apuntaba a archivos inexistentes, así que Chrome no ofrecía instalar la app. Se generaron los provisionales (192, 512, maskable 512 y 180 de iOS).
- **CSP de producción** bloqueaba Graph y Entra ID (corregido en la integración de la spec 006).
- **`fflate` 0.8.2** con vulnerabilidad moderada: se usa 0.8.3. `npm audit --omit=dev`: 0 vulnerabilidades.

## Pendiente de F10 (no automatizable)

F10.1 matriz de dispositivos (Android, iOS, Windows), revisión con TalkBack/VoiceOver, F10.7 piloto de una semana y el despliegue a PRD con el tenant real.

## Carga diferida de MSAL (2026-11-15)

`@azure/msal-browser` ya no está en el bundle inicial: `msalInstance.ts` lo importa dinámicamente y lo inicializa una sola vez. En modo `mock` (DEV y pruebas) nunca se descarga. En producción se descarga en paralelo mientras la app arranca, y el contenedor lo espera antes de leer la cuenta. Si la URL trae la respuesta del login (`#code=`, `error=`, `state=`…), el redirect se resuelve **antes** de pintar la app, igual que antes; en un arranque normal ya no se bloquea el primer render. `handleRedirectPromise` se sigue llamando siempre (limpia el estado de un login abandonado).

Verificado en un build con `VITE_AUTH_MODE=msal`: el chunk se descarga, la app llega al asistente sin errores de consola, incluso con una respuesta de login falsa en la URL.

**Efecto sobre Lighthouse**: el bundle bajó 64 KB gzip, pero la nota móvil simulada sigue entre 50 y 70 y **varía ±15 puntos entre ejecuciones en esta máquina**, así que no se puede atribuir una mejora medible. También se probó una entrada mínima que cargara el resto después del primer pintado: no mejoró y empeoró el TBT medido, y se descartó. Lo que queda por pesar es react-dom + react-router + zod + react-aria (≈1,5 MB sin comprimir) y el trabajo de renderizar la primera pantalla. Medir en la URL de DEV real (HTTP/2, CDN, dispositivo real) antes de decidir más cambios.
