# F10 — Rendimiento y preparación de release

**Fecha**: 2026-11-15 · **Medido sobre**: `vite build --mode development` servido con `vite preview` (Chromium 1248 de Playwright, Lighthouse 12.6.1, preset móvil por defecto: 4G lenta simulada + CPU 4× más lenta).

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
