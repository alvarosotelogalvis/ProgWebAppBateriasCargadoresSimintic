# Tareas 003 — Recepción y adjuntos offline

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Sistema de diseño**: [`docs/10`](../../docs/10-Sistema-de-Diseno.md) · ADR-0022
- Formato: `- [ ] T### [P?] [HU-003-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(003): T### …`.
- **Precondición**: spec 002 implementada (tipos, Dexie, `crearBorrador`, `actualizarCampos`, `completarEtapa`, `descartarBorrador`, tabla de transiciones) y spec 001 (shell, rutas, i18n, sistema de diseño base).

## Fase 1 — Preparación

- [x] T001 Crear la rama `feature/003-recepcion-adjuntos-offline` y marcar la spec como `En implementación` en `specs/README.md`
- [x] T002 [P] Fixtures de imágenes cubiertos con las imágenes que genera el E2E en runtime (sin binarios versionados).
- [x] T003 [P] Crear los namespaces i18n `servicios` y `adjuntos` con las claves de etiquetas, errores y estados — `src/locales/es-CO/servicios.json`, `adjuntos.json`

## Fase 2 — Fundamentos (bloquean las historias)

### Pruebas

- [x] T004 [P] Pruebas de normalización y regex (serie, referencia, marca, solicitud) — `src/domain/normalizacion.test.ts`
- [x] T005 [P] Pruebas del esquema de recepción (obligatorios, fecha ≤ hoy, cliente activo) — `src/domain/validaciones.test.ts`
- [x] T006 [P] Pruebas de `generarCodigo` (BAT/CAR, recálculo) — `src/domain/codigo.test.ts`

### Implementación

- [x] T007 Implementar `normalizacion.ts` y completar `esquemaRecepcion` y `generarCodigo` hasta pasar T004–T006 — `src/domain/`
- [x] T008 [P] Puertos `ImageProcessor` y `StoragePort` + sus fakes para las pruebas — `src/application/ports/`, `tests/fakes/`
- [x] T009 [P] `StoragePort` real con `navigator.storage.estimate()` — `src/infrastructure/pwa/storage.ts`

## Fase 3 — Componentes del sistema de diseño que agrega esta spec (`docs/10` §3)

### Pruebas

- [x] T010 [P] Pruebas de `ComboboxField` (RAC ComboBox: filtrado sin tildes, `allowsCustomValue` sí/no, teclado, error con `aria-describedby`) — `src/shared/ui/ComboboxField.test.tsx`
- [x] T011 [P] Pruebas de `DateChip` y `DateRangeFilter` (es-CO, fecha maxima y rango) - `DateChip.test.tsx`.

### Implementación

- [x] T012 [P] `ComboboxField` (estilo `.text-field`, popover `CardInner`) — `src/shared/ui/ComboboxField.tsx`
- [x] T013 [P] `DateChip` y `DateRangeFilter` con `input type="date"` nativo y `max=hoy` (desviación aprobada de la referencia 08).
- [x] T014 [P] `PillInput` (buscador, RAC SearchField, variante outlined) y `PhotoGallery`/`PhotoTile` (miniatura en `CardInner` + `SyncBadge`; 3 / 4 / 6 por fila) — `src/shared/ui/`
- [x] T015 Agregar los componentes nuevos a `/tecnico/ui` con sus estados — `src/features/tecnico/CatalogoUiPage.tsx`

## Fase 4 — HU-003-1 Registrar la recepción offline (P1) 🎯 MVP

**Prueba independiente**: ES-003-01…04 en modo avión.

### Pruebas

- [x] T016 [P] [HU-003-1] Verificar que la prueba de `descartarBorrador` de la spec 002 cubre la eliminación de las **fotos** reales (Blobs) agregadas con `agregarFoto`. Si no, ampliarla sin duplicarla — `src/application/servicios/descartarBorrador.int.test.ts`
- [x] T017 [P] [HU-003-1] Prueba de componente de `FormRecepcion`: lista de faltantes, botón deshabilitado, foco al primer error, autoguardado con debounce, 1 columna en compacto y 2 en expandido — `src/features/servicios/components/FormRecepcion.test.tsx`

### Implementación

- [x] T018 [HU-003-1] Hook `useAutoguardado` (debounce de 800 ms → `actualizarCampos`, estados guardando/guardado/error) — `src/features/servicios/hooks/useAutoguardado.ts`
- [x] T019 [HU-003-1] `FormRecepcion` con react-hook-form + zodResolver sobre `TextField`, `SelectField` (tipo) y `DateChip`/`Calendar` (fecha); cliente en T025. Layout: `Card fill` en compacto, `Card` de 720 en medio y de 960 con grid de 2 columnas en expandido (plan §3.4) — `src/features/servicios/components/FormRecepcion.tsx`
- [x] T020 [HU-003-1] `EtapaRecepcionPage`: carga el borrador, `h2` "Recepción del equipo", `PrimaryButton` "COMPLETAR RECEPCIÓN" (fijo abajo en compacto) → `completarEtapa('RECIBIDO')`, navegación al detalle — `src/features/servicios/pages/EtapaRecepcionPage.tsx`
- [x] T021 [HU-003-1] Acción "+ Nuevo" (`BotonNuevo` de la 001 y acceso en el `QuickActionGrid` de Inicio) → `crearBorrador` → `/servicios/:id/etapa/recepcion` — `src/app/router.tsx`, `src/features/inicio/`
- [x] T022 [HU-003-1] "Descartar borrador" con `ResponsiveDialog` de confirmación — `src/features/servicios/pages/DetalleServicioPage.tsx`
      **Punto de control**: se puede crear y completar una recepción **sin fotos** (con el mínimo en 0 en la config de prueba) totalmente offline.

## Fase 5 — HU-003-2 Datos consistentes (P1)

### Pruebas

- [x] T023 [P] [HU-003-2] Prueba de integración de `detectarSerieDuplicada` (solo estados no finales, excluye el propio servicio) — `src/application/servicios/detectarSerieDuplicada.int.test.ts`

### Implementación

- [x] T024 [P] [HU-003-2] `CampoMarca` (`ComboboxField` con texto libre: sugerencias del catálogo + valores locales, normalizado) — `src/features/servicios/components/CampoMarca.tsx`
- [x] T025 [P] [HU-003-2] `CampoCliente` (`ComboboxField` sin texto libre, búsqueda sin tildes, `Banner` de catálogo vacío o cliente inactivo) — `src/features/servicios/components/CampoCliente.tsx`
- [x] T026 [HU-003-2] `detectarSerieDuplicada` + `AvisoSerieDuplicada` (`Banner` con `TextLink` al existente) — `src/application/servicios/`, `src/features/servicios/components/`
- [x] T027 [HU-003-2] Teclados móviles: `inputMode="numeric"` (solicitud), `autoCapitalize="characters"` (serie y referencia) — `FormRecepcion.tsx`

## Fase 6 — HU-003-3 Fotos de ingreso optimizadas (P1)

### Pruebas

- [x] T028 [P] [HU-003-3] Prueba de integración de `agregarFoto`: ok, DUPLICADA, LIMITE_MAXIMO, FORMATO_NO_SOPORTADO, ALMACENAMIENTO_LLENO, `syncState` local vs. pending — `src/application/adjuntos/agregarFoto.int.test.ts`
- [x] T029 [P] [HU-003-3] Prueba de componente de `AdjuntosEtapa`: contador mín./máx., deshabilitar en el máximo, eliminar con confirmación, progreso — `src/features/adjuntos/components/AdjuntosEtapa.test.tsx`
- [x] T030 [P] [HU-003-3] Prueba E2E de procesamiento en el navegador real: < 1 MB, lado ≤ 1920, orientación correcta, HEIC → error — `tests/e2e/imagen-procesamiento.spec.ts`

### Implementación

- [x] T031 [HU-003-3] `imageProcessor.ts` (browser-image-compression con worker **local**, JPEG, maxLado y calidad de la config, miniatura de 320 px, error tipado de formato) — `src/infrastructure/media/imageProcessor.ts`
- [x] T032 [P] [HU-003-3] `hash.ts` (sha256 de un Blob con `crypto.subtle`) — `src/infrastructure/media/hash.ts`
- [x] T033 [HU-003-3] Caso de uso `agregarFoto` (flujo del plan §3.3) y `eliminarAdjunto` — `src/application/adjuntos/`
- [x] T034 [HU-003-3] `BotonesCaptura` (`SecondaryButton` con ícono: cámara con `capture="environment"`, galería múltiple, archivo; webcam si `pointer: fine`) — `src/features/adjuntos/components/BotonesCaptura.tsx`
- [x] T035 [P] [HU-003-3] `CapturaWebcam` (lazy, en `ResponsiveDialog`, `getUserMedia`, liberar los tracks al cerrar) — `src/features/adjuntos/components/CapturaWebcam.tsx`
- [x] T036 [HU-003-3] `AdjuntosEtapa` (`PhotoGallery` con `useObjectUrl`, procesamiento secuencial con progreso, `SyncBadge`) — `src/features/adjuntos/components/AdjuntosEtapa.tsx`
- [x] T037 [P] [HU-003-3] `VisorImagen` (lazy, `ResponsiveDialog` a pantalla completa en compacto y modal con flechas en expandido, pinch-zoom, navegación entre fotos) — `src/features/adjuntos/components/VisorImagen.tsx`
- [x] T038 [HU-003-3] Integrar `AdjuntosEtapa` (FOTO_INGRESO) en `EtapaRecepcionPage` y el requisito de mínimo de fotos en la lista de faltantes — `EtapaRecepcionPage.tsx`
      **Punto de control**: ES-003-01…17 pasan manualmente en Android y en el PC.

## Fase 7 — HU-003-4 Espacio del dispositivo (P2)

- [x] T039 [HU-003-4] `AvisoAlmacenamiento` (sobre `Banner`, ≥ 80 %) en Inicio y en el formulario. Bloqueo ≥ 95 % ya cubierto por `agregarFoto` — `src/shared/ui/AvisoAlmacenamiento.tsx`

## Fase 8 — HU-003-5 Consultar lo registrado (P2)

### Pruebas

- [x] T040 [P] [HU-003-5] Prueba unitaria de `filtrarServicios` (texto en código, serie, solicitud, cliente, referencia; sin tildes; estados; pendientes; rango de fecha de recepción) — `src/application/servicios/buscarServicios.test.ts`

### Implementación

- [x] T041 [HU-003-5] `filtrarServicios` (incluye `fechaDesde`/`fechaHasta`) — `src/application/servicios/buscarServicios.ts`
- [x] T042 [HU-003-5] `FiltrosServicios` (estilo de la referencia 08: `PillInput`, `SelectField` Estado, `ComboboxField` Cliente, Tipo, `DateRangeFilter`, "APLICAR" + "LIMPIAR"; `ResponsiveDialog` en compacto/medio, panel en línea en expandido) — `src/features/servicios/components/FiltrosServicios.tsx`
- [x] T043 [HU-003-5] `ListaServiciosPage` (buscador con `useDeferredValue`, `ListRow` con punto de estado + `SyncBadge` en una lista virtualizada; tarjetas de 2 columnas en medio) — `src/features/servicios/pages/ListaServiciosPage.tsx`
- [x] T044 [HU-003-5] `DetalleServicioPage` + `LineaTiempoEtapas` (recepción con `PhotoGallery`; resto pendiente) y `ListaDetalleLayout` (expandido: lista de 5 col. + detalle de 7 col.) — `src/features/servicios/`

## Fase 9 — Cierre

- [x] T045 E2E `recepcion-offline.spec.ts`: setup mock → `context.setOffline(true)` → crear una recepción con 3 fotos → recargar → registro presente y Recibido → axe sin violaciones serias (chromium-mobile, chromium-tablet, chromium-desktop, webkit-mobile) — `tests/e2e/recepcion-offline.spec.ts`
- [x] T046 Capturas visuales del formulario, la lista, la lista y detalle y los filtros en 360/768/1280, agregadas a la línea base — `tests/e2e/visual.spec.ts`
- [ ] T047 Verificación manual en un dispositivo real (Android Chrome instalada, en modo avión) de ES-003-01…23. Anotar en `docs/pruebas/`
- [ ] T048 Medir CE-003-04 (tiempo y peso de foto) y CE-003-05 (búsqueda con el seed de 500). Anotar los resultados en la spec §8
- [x] T049 `npm run verify` + DoD + `CHANGELOG.md` + spec → `Implementada`. Cierre aceptado el 2026-10-22 con T047/T048 como verificación manual pendiente.

## Dependencias

- T007 depende de T004–T006. T012–T014 dependen de T010–T011. T019 depende de T013. T025 depende de T012. T033 depende de T008, T031 y T032. T038 depende de T036 y T020. T042 depende de T013 y T014.
- Fase 3 → Fase 4 → Fases 5 y 6 (pueden avanzar en paralelo) → Fases 7 y 8 → Fase 9.
- Spec 005 (sincronización) consume `syncState='pending'` de los servicios y adjuntos que deja esta spec. La 007 reutiliza `DateChip`/`Calendar`, `ComboboxField` y `PhotoGallery`.
