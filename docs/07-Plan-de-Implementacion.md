# Plan de implementación

> Para el agente de IA o el desarrollador que construye la app. Cada fase produce algo **funcional y probado**. No se empieza una fase sin terminar la Definition of Done de la anterior (ver `CLAUDE.md` §9).
> Cada tarea va en su propia rama corta (`feature/Fx-…`), con commits frecuentes y merge a `main` cuando `npm run verify` está en verde (ADR-0015).

> **Relación con `specs/`**: este documento da la visión por fases. El detalle ejecutable de cada fase (historias, escenarios Given/When/Then, archivos y tareas `T###`) está en su spec. Si hay diferencias, **manda la spec aprobada** y este documento se actualiza.

## Resumen de fases

| Fase | Objetivo                                       | Entregable verificable                                       | Depende de           | Spec                                                            |
| ---- | ---------------------------------------------- | ------------------------------------------------------------ | -------------------- | --------------------------------------------------------------- |
| F0   | Andamiaje, herramientas y **spikes de riesgo** | PWA vacía instalable, desplegada en DEV; spikes documentados | Tenant DEV (06 §1–2) | [001](../specs/001-fundacion-pwa/spec.md)                       |
| F1   | Dominio y persistencia local                   | Dominio + Dexie con pruebas (sin UI)                         | F0                   | [002](../specs/002-dominio-persistencia-local/spec.md)          |
| F2   | Shell de UI                                    | Layout, rutas, menús, ajustes, i18n, puerta de instalación   | F1                   | [001](../specs/001-fundacion-pwa/spec.md)                       |
| F3   | Recepción + adjuntos (offline)                 | Crear una recepción con fotos en modo avión                  | F2                   | [003](../specs/003-recepcion-adjuntos-offline/spec.md)          |
| F4   | Autenticación + configuración inicial          | Login, roles, catálogos descargados, script de SharePoint    | F2, tenant           | [004](../specs/004-autenticacion-configuracion-inicial/spec.md) |
| F5   | Sync push                                      | Registros y archivos subidos de forma idempotente            | F3, F4               | [005](../specs/005-sincronizacion-push/spec.md)                 |
| F6   | Sync pull + conflictos                         | Cambios remotos visibles; conflictos resolubles              | F5                   | [006](../specs/006-sincronizacion-pull-conflictos/spec.md)      |
| F7   | ✅ Etapas restantes + roles                    | Ciclo completo hasta facturación / DF / anulación            | F3, F6               | [007](../specs/007-etapas-servicio-roles/spec.md)               |
| F8   | Alertas + Power Automate                       | Alertas en la app y correos funcionando en DEV               | F7                   | [008](../specs/008-alertas-notificaciones/spec.md)              |
| F9   | Menú técnico, respaldo, purgas, logs           | Soporte y operación                                          | F6                   | [009](../specs/009-soporte-respaldo-purgas/spec.md)             |
| F10  | Endurecimiento y release 1.0.0                 | Pruebas en dispositivos, Lighthouse, a11y, PRD desplegado    | Todo                 | — (este documento §F10)                                         |

---

## F0 — Andamiaje y spikes

**Preguntas a confirmar antes**: PA-10 (Acceso Condicional) y PA-11 (cuenta de Cloudflare).

### Tareas

1. **F0.1 Repo y andamiaje** (`chore/F0-andamiaje`): ejecutar `05-Stack-y-Entorno-de-Desarrollo.md` §3 y §12. Crear `.gitattributes`, `.gitignore` (incluye `.env*` excepto `.env.example`), `.node-version`, `.editorconfig`, `.vscode/`.
2. **F0.2 TypeScript estricto**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Alias `@/` → `src/`.
3. **F0.3 ESLint + Prettier + reglas de capas** (SDD §4.1) con `eslint-plugin-boundaries`. Agregar `jsx-a11y` y una regla que prohíba `dangerouslySetInnerHTML` y `localStorage` fuera de `infrastructure/auth` y `features/ajustes`.
4. **F0.4 Hooks**: husky `pre-commit` → `lint-staged` (eslint --fix, prettier). `commit-msg` → commitlint (Conventional Commits). `pre-push` → `npm run typecheck && npm run test -- --run`.
5. **F0.5 Scripts de `package.json`**: los de `CLAUDE.md` §6. `verify` = `lint && typecheck && test --run`. `release` = `commit-and-tag-version`.
6. **F0.6 PWA base**: `vite-plugin-pwa` con el manifest de SDD §11.1, íconos (placeholder generado con el logo o iniciales "ST"), `registerType: 'prompt'`, `public/_headers` (SDD §14.2) y `public/robots.txt`.
7. **F0.7 Env**: `src/shared/env.ts` con validación zod. `.env.example`, `.env.development`, `.env.test` (`VITE_AUTH_MODE=mock`). Bloqueo del build de producción con mock (SDD §8.6). `define` de versión, commit y fecha.
8. **F0.8 Vitest + Playwright** configurados con una prueba trivial de cada uno. Proyectos de Playwright: `chromium-mobile` (Pixel 7), `webkit-mobile` (iPhone 14) y `chromium-desktop`.
9. **F0.9 Despliegue DEV**: `npm run deploy:dev` a Cloudflare Pages (rama `dev`). Verificar HTTPS, cabeceras e instalación.
10. **F0.10 Spikes** (cada uno en una rama `spike/…` desechable; el resultado se documenta en `docs/spikes/Sx-*.md` y, si cambia una decisión, en un ADR nuevo):

| Spike | Pregunta                                                                                                                                                      | Criterio de éxito                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| S1    | ¿`loginRedirect` + `acquireTokenSilent` de MSAL funcionan en la PWA **instalada** en iOS, Android y Windows? ¿Persiste la sesión al cerrar y abrir?           | Login completo y token silencioso tras reabrir en los 3. Si falla en iOS: documentar la alternativa (abrir el login en Safari) y crear el ADR |
| S2    | ¿`Sites.Selected` delegado con el grant `write` permite crear un ítem y subir un archivo?                                                                     | `POST` de ítem y `PUT` de archivo OK con un usuario con _Colaborar_                                                                           |
| S3    | ¿`PATCH …/items/{id}/fields` respeta `If-Match` (412)? ¿Cómo vuelven las fechas de solo fecha?                                                                | Documentar el comportamiento. Si no hay 412, implementar el respaldo "GET + comparar eTag antes del PATCH"                                    |
| S4    | ¿`lists/{id}/items/delta?$expand=fields` devuelve los campos y un `deltaLink` estable?                                                                        | Si sí, usar delta. Si no, el filtro por `Modified` (SDD §9.4)                                                                                 |
| S5    | Persistencia y cuota de IndexedDB en iOS instalada: ¿`storage.persist()`? ¿Cuánto permite? ¿Sobrevive 8 días sin abrir la app?                                | Datos presentes y la cuota reportada documentada                                                                                              |
| S6    | Cámara con `capture` en iOS y Android; tiempo de compresión de una foto de 12 MP en gama baja                                                                 | < 2 s en gama media, < 4 s en gama baja                                                                                                       |
| S7    | Acceso Condicional con un dispositivo no administrado                                                                                                         | Graph responde 200 desde un teléfono personal                                                                                                 |
| S8    | CSP de `_headers` (`style-src 'self'` sin `unsafe-inline`, `font-src 'self'`) con React Aria Components, CSS Modules, MSAL (iframe) y el worker de compresión | Sin violaciones de CSP en la consola                                                                                                          |

**Criterios de aceptación de F0**: `npm run verify` en verde. App vacía instalable desde `dev.*.pages.dev` en Android, iOS y Windows, funcionando offline (pantalla "Hola" cargada sin red). Los 8 spikes documentados.

---

## F1 — Dominio y persistencia local

**Preguntas antes**: PA-07 y PA-12.

1. **F1.1** `domain/servicio.ts`, `adjunto.ts` y `config.ts` (tipos + defaults, SDD §5 y modelo de datos).
2. **F1.2** `domain/validaciones.ts`: esquemas zod por etapa, normalizaciones y mensajes como claves i18n.
3. **F1.3** `domain/estados.ts`: tabla de transiciones completa (modelo de datos §5), `camposEditables` y `transicionesDisponibles`. **Cobertura del 100 %**.
4. **F1.4** `domain/codigo.ts`, `domain/alertas.ts` (nivel por días y umbrales) y `domain/merge.ts` (SDD §9.5, tabla de casos).
5. **F1.5** `infrastructure/db/dexie.ts` (esquema v1), repositorios que implementan los puertos y hooks `useServicios`, `useServicio(id)` y `useAdjuntos(id)` con `useLiveQuery`.
6. **F1.6** Casos de uso `application/servicios/*`: `crearBorrador`, `actualizarCampos` (gestiona `camposSucios` y `syncState`), `completarEtapa`, `anular` y `descartarBorrador`.
7. **F1.7** `infrastructure/logging/logger.ts` (anillo de 2000 entradas).

**Aceptación**: pruebas de integración con `fake-indexeddb`: crear un borrador → completar la recepción → `syncState = 'pending'` y `camposSucios` correctos. Cobertura de `domain/` y `application/` ≥ 90 %.

---

## F2 — Shell de UI

1. **F2.1** Sistema de diseño (`docs/10`, ADR-0022): `tokens.css`, fuentes e íconos autoalojados, `GradientBackground`, `AppShell` + `ResponsiveNav` (3 breakpoints), catálogo base de componentes y la página `/tecnico/ui`. `providers.tsx` (i18n, RAC I18nProvider es-CO, ErrorBoundary) y escala de fuente.
2. **F2.2** `router.tsx` con las rutas de `04-UX` §2 (lazy) y los guards `SetupGuard`, `InstallGate` y `RoleGuard` (con auth mock en esta fase).
3. **F2.3** Layout responsive: barra inferior en celular y lateral en tablet/PC. Indicador de conexión (`useOnline`) y contador de pendientes.
4. **F2.4** Pantallas: Inicio (con datos locales), Instalar (instrucciones por plataforma + `beforeinstallprompt`), Más, Ajustes, Ayuda (contenido inicial en `locales/es-CO/ayuda.json`) y Acerca de (versión, commit, fecha, ambiente, CHANGELOG embebido con `?raw`).
5. **F2.5** Actualización del SW con toast y bloqueo mientras hay un formulario con cambios sin guardar (SDD §11.4).

**Aceptación**: navegación completa sin red. Lighthouse PWA "installable". axe sin violaciones serias en Inicio, Más y Ajustes. El tamaño de fuente cambia toda la UI.

---

## F3 — Recepción y adjuntos (offline)

**Preguntas antes**: PA-08 y PA-09.

1. **F3.1** `features/servicios`: lista (búsqueda, filtros, virtualización, badges) y detalle con la línea de tiempo.
2. **F3.2** Formulario de **recepción** (`react-hook-form` + zod) con autoguardado, combobox de cliente (catálogo, sin texto libre), combobox de marca (texto libre normalizado) y advertencia de serie duplicada abierta.
3. **F3.3** `infrastructure/media/imageProcessor.ts` (Web Worker), miniaturas y sha256.
4. **F3.4** Componente `Galeria` / `AdjuntosEtapa`: cámara, galería, archivo, webcam en escritorio, progreso, visor, eliminar y límites mín./máx. Componente `AdjuntoPdf` con validación de firma y tamaño.
5. **F3.5** Control de cuota (`navigator.storage.estimate()`): advertencia y bloqueo (RNF-07).
6. **F3.6** "Completar recepción" → `RECIBIDO`, pendiente de sync.
7. **F3.7** Catálogos de prueba en `.env.test` / seed para desarrollo sin tenant.

**Aceptación**: en modo avión, en Android y en un navegador de escritorio: crear una recepción con 3 fotos, cerrar la app, reabrir y encontrar el registro con sus fotos. E2E `recepcion-offline.spec.ts` en verde en chromium-mobile y webkit-mobile.

---

## F4 — Autenticación y configuración inicial

**Preguntas antes**: PA-06 y PA-14. Tenant DEV configurado (06 §1–2).

1. **F4.1** `msalConfig.ts`, `msalAuthAdapter.ts` (AuthPort), `main.tsx` con `initialize()` + `handleRedirectPromise()`. Validación de `tid` y `roles`.
2. **F4.2** `mockAuthAdapter.ts` para pruebas, seleccionado por `VITE_AUTH_MODE`.
3. **F4.3** `infrastructure/graph/graphClient.ts`: wrapper de `fetch` con token, `client-request-id`, timeouts, traducción a `AppError` y reintentos (SDD §9.6).
4. **F4.4** `sharepointGateway.ts`: `resolverSitio`, `leerCatalogos` (clientes, marcas, choices) y `leerConfiguracion`.
5. **F4.5** Asistente `/configuracion-inicial` (04-UX §3.2) con `storage.persist()`.
6. **F4.6** `useRoles()` y `RoleGuard` con roles reales. Mi cuenta: cambiar de cuenta y cerrar sesión (sin borrar pendientes).
7. **F4.7** `scripts/provision-sharepoint.ps1` (PnP.PowerShell, idempotente; 06 §2.6). Opcional si el administrador lo hace a mano.

**Aceptación**: en la PWA instalada (Android + iOS + Windows), login → catálogos descargados → modo avión → crear una recepción con el cliente del catálogo. Un usuario sin rol ve "Sin acceso".

---

## F5 — Sincronización push

1. **F5.1** Mappers dominio ↔ SP (SDD §7.4) con pruebas de ida y vuelta.
2. **F5.2** Gateway: `buscarServicioPorId`, `crearServicio`, `actualizarServicio` (If-Match o el respaldo de S3), `subirArchivo` (simple ≤ 4 MB / upload session reanudable), `actualizarMetadatosArchivo`, `eliminarArchivo` y `registrarLogSync`.
3. **F5.3** `SyncEngine` push (SDD §9.2) con Web Locks, eventos de progreso, cancelación, backoff y clasificación de errores.
4. **F5.4** Pantalla `/sincronizacion` con la confirmación de identidad (SDD §8.4), progreso, errores, reintento y resumen. Aviso al volver la conexión (§9.7) y recordatorio de pendientes antiguos.
5. **F5.5** `VersionMinimaApp`: bloqueo de la sincronización.
6. **F5.6** Pruebas de integración con MSW: éxito, red caída a mitad de un archivo (reanuda sin duplicar), 409 al crear, 429 con `Retry-After`, 401 → silent → redirect, 403.

**Aceptación**: en DEV, 3 recepciones con 10 fotos en total, creadas offline, se sincronizan. En SharePoint hay 3 ítems y 10 archivos en sus carpetas con metadatos. Al repetir la sincronización no aparece nada duplicado. Al cortar la red a mitad y reintentar, el resultado es idéntico. Hay un ítem en `LogSincronizacion`.

---

## F6 — Sincronización pull y conflictos

1. **F6.1** `cambiosServicios` (delta o filtro según S4) e inserción de servicios remotos (`origen='remoto'`).
2. **F6.2** `mergeTresVias` integrado y estado `conflict`.
3. **F6.3** Pantalla Resolver conflicto (04-UX §3.9).
4. **F6.4** Adjuntos remotos: listar al abrir el detalle con conexión y descargar las miniaturas de los servicios abiertos (límite de 50 por sync). Botón "Abrir en SharePoint".
5. **F6.5** Refresco de catálogos y configuración en cada sync.

**Aceptación**: el dispositivo A crea y sincroniza. El dispositivo B sincroniza y ve el servicio. B diagnostica offline mientras A cambia la observación en SharePoint web. B sincroniza → conflicto solo en `observacionTecnica`; el resto se combina. Se resuelve y se sincroniza.

---

## F7 — Etapas restantes y roles

**Preguntas antes**: PA-01, PA-02, PA-03 y PA-13.

1. **F7.1** Formulario de diagnóstico, con la rama de disposición final (fecha de socialización + PDF) que cierra el registro.
2. **F7.2** Cotización (fecha, valor COP, estado de la respuesta, PDF opcional).
3. **F7.3** Orden de trabajo (detalle, costo).
4. **F7.4** Entrega (fecha, fotos de salida, vida útil con sugerencia y chips).
5. **F7.5** Facturación (PDF, fecha, número).
6. **F7.6** Anulación (Admin) y corrección de etapas cerradas (Admin).
7. **F7.7** Tarjetas de Inicio por rol.

**Aceptación**: E2E del ciclo completo (Técnico → Comercial → Técnico → Comercial) con auth mock por rol y Graph interceptado. En DEV real, un servicio recorre todas las etapas en dos dispositivos con usuarios de roles distintos.

---

## F8 — Alertas y Power Automate

**Preguntas antes**: PA-04 y PA-05.

1. **F8.1** Pantalla `/alertas` y tarjeta en Inicio (cálculo con `domain/alertas.ts`).
2. **F8.2** Crear y probar los flujos (06 §3) en DEV junto con el administrador. Exportar los flujos como paquete (`.zip`) a `docs/powerautomate/` para reproducirlos en PRD.

**Aceptación**: las pruebas de 06 §3.3 pasan.

---

## F9 — Menú técnico, respaldo, purgas y logs

1. **F9.1** `/tecnico` (04-UX §5): estado del dispositivo y de SharePoint, visor de logs.
2. **F9.2** `exportarRespaldo` (fflate + Web Share API Level 2 con respaldo de descarga) e `importarRespaldo` (Admin, RF-19).
3. **F9.3** Purgas automáticas tras el sync y "Liberar espacio" manual (con pruebas de no-pérdida).
4. **F9.4** Restablecer la app (Admin) con las salvaguardas.

**Aceptación**: exportar en el dispositivo A, importar en B y sincronizar desde B produce los mismos ítems sin duplicar. Las purgas nunca tocan pendientes (prueba).

---

## F10 — Endurecimiento y release 1.0.0

1. **F10.1** Matriz de pruebas manuales en dispositivos (`08-Plan-de-Pruebas.md` §5).
2. **F10.2** Lighthouse ≥ 90 (Performance, Accessibility, Best Practices) en móvil. Bundle inicial ≤ 350 KB gzip.
3. **F10.3** axe sin violaciones serias en todas las pantallas. Revisión con lector de pantalla (TalkBack / VoiceOver) en el flujo de recepción.
4. **F10.4** `npm audit --omit=dev` sin altas ni críticas.
5. **F10.5** Contenido final de la Ayuda y del Acerca de, y guía de instalación para usuarios (PDF o página) a partir de `09` §4.
6. **F10.6** Configurar PRD (06 completo para PRD), `.env.production`, `npm run release` → `v1.0.0`, `npm run deploy:prod`.
7. **F10.7** Piloto con 2–3 usuarios durante 1 semana. Revisar `LogSincronizacion` y los errores.
8. **F10.8** Revisar los ADR: pasar a `Aceptado` los `Propuesto` confirmados y reemplazar los que cambiaron.

**Aceptación**: checklist de release (`09` §3) completo.

---

## Backlog posterior a 1.0 (no implementar sin aprobación)

- Notificaciones push (Web Push; en iOS solo para PWA instalada).
- Firma digital del cliente en la entrega (canvas).
- Lector de códigos QR o de barras para la serie (`BarcodeDetector` / ZXing).
- Generar el PDF del acta de recepción o de entrega en el dispositivo.
- Panel de indicadores (Power BI sobre la lista).
- Empaquetar con Capacitor si iOS da problemas de almacenamiento (ADR nuevo).
