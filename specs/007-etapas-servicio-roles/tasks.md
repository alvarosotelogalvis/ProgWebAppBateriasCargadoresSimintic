# Tareas 007 — Etapas del servicio y roles

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-007-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(007): T### …`.
- **Precondición**: specs 003 (formulario de recepción, `AdjuntosEtapa`, `useAutoguardado`, `filtrarServicios`), 004 (`useRoles`, `RoleGuard`) y 006 (descarga y conflictos) implementadas.

## Fase 1 — Preparación

- [x] T001 Confirmar con el usuario PA-01, PA-02, PA-03 y PA-13 y anotar las respuestas en spec §8. Si cambian el flujo, crear un ADR que reemplace a ADR-0012 antes de seguir. Crear la rama y marcar la spec como `En implementación` — `specs/007-etapas-servicio-roles/spec.md`, `specs/README.md`
- [x] T002 [P] Agregar los fixtures de PDF (válido de 200 KB, 25 MB, `.pdf` falso de texto, con cabecera desplazada) — `tests/fixtures/pdf/`
- [x] T003 [P] Crear el namespace i18n `etapas` (etiquetas, acciones, faltantes, "Pendiente de <rol>", errores de PDF y fechas, avisos de DF) — `src/locales/es-CO/etapas.json`

## Fase 2 — Fundamentos de dominio (bloquean todas las historias)

### Pruebas

- [x] T004 [P] Pruebas de todas las transiciones posteriores a RECIBIDO (válida, falta requisito, rol incorrecto), incluidas DF, entrega sin reparación y anulación — `src/domain/estados.test.ts`
- [x] T005 [P] Pruebas de la matriz `camposEditables` estado × rol (incluido Admin en estados finales) — `src/domain/estados.camposEditables.test.ts`
- [x] T006 [P] Pruebas de los esquemas por etapa (diagnóstico, DF, cotización, OT, entrega, entrega sin reparación, facturación, anulación) — `src/domain/validaciones.test.ts`
- [x] T007 [P] Pruebas de `validacionesCruzadasFechas` y `sugerirVidaUtil` (31-ene + 1 mes, 29-feb) — `src/domain/fechas.test.ts`, `src/domain/vidaUtil.test.ts`
- [x] T008 [P] Pruebas de `esFirmaPdf` y `tarjetasPorRol` — `src/domain/pdf.test.ts`, `src/domain/tarjetasInicio.test.ts`

### Implementación

- [x] T009 Completar `TRANSICIONES` y `camposEditables` hasta pasar T004–T005 (cobertura del 100 % de la tabla). Verificar que la anulación no borre datos — `src/domain/estados.ts`
- [x] T010 [P] Esquemas por etapa — `src/domain/validaciones.ts`
- [x] T011 [P] `fechas.ts`, `vidaUtil.ts`, `pdf.ts` y `tarjetasInicio.ts` — `src/domain/`
- [ ] T012 [P] Verificar que los mappers de la 005 cubren ida y vuelta todos los campos de `docs/03` §2.3–§2.7 y los tipos de adjunto §3.1; agregar los casos faltantes a la prueba — `src/infrastructure/graph/mappers/*.test.ts`

## Fase 3 — Base de UI de etapas

### Pruebas

- [ ] T013 [P] Prueba de componente de `FormEtapa`: campos en solo lectura según `camposEditables`, "Pendiente de <rol>", lista de faltantes, foco al primer error, autoguardado, 1 columna en compacto y 2 en expandido. Además, prueba del componente de catálogo `PhotoCarousel` (teclado, anuncio "Foto n de m", flechas, 1/3/5 visibles según el breakpoint) — `src/features/servicios/components/FormEtapa.test.tsx`, `src/shared/ui/PhotoCarousel.test.tsx`

### Implementación

- [ ] T014 `FormEtapa` (contenedor genérico, plan §3.3: `Card fill` / 720 / 960 en 2 columnas, `h2`, `PrimaryButton` de la transición y `SecondaryButton` "CANCELAR", dentro del panel de detalle en expandido) — `src/features/servicios/components/FormEtapa.tsx`
- [ ] T015 Rutas `/servicios/:id/etapa/:etapa` con `RoleGuard` por etapa (lazy) — `src/app/router.tsx`
- [ ] T016 `PhotoCarousel` (catálogo + `/tecnico/ui`, referencia 05) y `CabeceraServicio` (carrusel de fotos de ingreso y salida + código + `StatusBadge`) en el detalle. Ampliar `LineaTiempoEtapas` con el resumen por etapa, la acción disponible y "Pendiente de <rol>" — `src/shared/ui/PhotoCarousel.tsx`, `src/features/servicios/components/CabeceraServicio.tsx`, `LineaTiempoEtapas.tsx`

## Fase 4 — HU-007-7 PDF válido (P1) — prerrequisito de las etapas

### Pruebas

- [x] T017 [P] [HU-007-7] Prueba de integración de `agregarPdf`: ok, NO_ES_PDF, TAMANO_EXCEDIDO, ALMACENAMIENTO_LLENO, reemplazo local y reemplazo de uno sincronizado (`eliminarRemoto`) — `src/application/adjuntos/agregarPdf.int.test.ts`
- [x] T018 [P] [HU-007-7] Prueba de componente de `AdjuntoPdf` (ver, reemplazar, eliminar con confirmación, solo lectura) — `src/features/adjuntos/components/AdjuntoPdf.test.tsx`

### Implementación

- [x] T019 [HU-007-7] Caso de uso `agregarPdf` — `src/application/adjuntos/agregarPdf.ts`
- [x] T020 [HU-007-7] `AdjuntoPdf` (vista previa en un `CardInner` centrado al estilo de la referencia 10, ícono `picture_as_pdf`, nombre y tamaño; Ver = object URL en pestaña nueva; Reemplazar y Eliminar con `ResponsiveDialog`) — `src/features/adjuntos/components/AdjuntoPdf.tsx`

## Fase 5 — HU-007-1 y HU-007-2 Diagnóstico y disposición final (P1) 🎯

### Pruebas

- [x] T021 [P] [HU-007-2] Prueba de integración de la rama DF → normal: completar como DIAGNOSTICADO limpia `fechaSocializacionDF` y elimina el adjunto DISPOSICION_FINAL — `src/application/servicios/completarEtapa.df.int.test.ts`

### Implementación

- [x] T022 [P] [HU-007-1] `CampoDiagnostico` (valores de `choices:Diagnostico`, marca "valor anterior") — `src/features/servicios/components/CampoDiagnostico.tsx`
- [x] T023 [HU-007-1] `EtapaDiagnosticoPage` (diagnóstico, observación, `AdjuntoPdf` FORMATO_DIAGNOSTICO) — `src/features/servicios/pages/EtapaDiagnosticoPage.tsx`
- [x] T024 [HU-007-2] Rama DF en `EtapaDiagnosticoPage`: campos condicionales, aviso, `AdjuntoPdf` DISPOSICION_FINAL, diálogo de confirmación, ocultar la rama si el valor configurado no existe — `src/features/servicios/pages/EtapaDiagnosticoPage.tsx`
- [x] T025 [HU-007-2] Limpieza de datos DF al completar como DIAGNOSTICADO (pasa T021) — `src/application/servicios/completarEtapa.ts`
      **Punto de control**: ES-007-01…08 pasan offline.

## Fase 6 — HU-007-3 Cotización (P1)

### Pruebas

- [x] T026 [P] [HU-007-3] Prueba de integración de `cambiarRespuestaCotizacion` (solo en COTIZADO, solo Comercial o Admin) — `src/application/servicios/cambiarRespuestaCotizacion.int.test.ts`
- [x] T027 [P] [HU-007-3] Prueba de los componentes `AmountInput` (catálogo: RAC NumberField, formato es-CO COP, entero, separadores) y `CampoMoneda` (negativos rechazados, puntos y comas) — `src/shared/ui/AmountInput.test.tsx`, `src/features/servicios/components/CampoMoneda.test.tsx`

### Implementación

- [x] T028 [HU-007-3] `cambiarRespuestaCotizacion` — `src/application/servicios/cambiarRespuestaCotizacion.ts`
- [x] T029 [P] [HU-007-3] `AmountInput` (catálogo + `/tecnico/ui`; "COP" en `primary` a la izquierda y el monto en `amount-xl`, referencia 10) y `CampoMoneda` como envoltorio de formulario — `src/shared/ui/AmountInput.tsx`, `src/features/servicios/components/CampoMoneda.tsx`
- [x] T030 [HU-007-3] `EtapaCotizacionPage` (fecha de envío, valor, `AdjuntoPdf` COTIZACION opcional, selector de respuesta habilitado en COTIZADO) — `src/features/servicios/pages/EtapaCotizacionPage.tsx`

## Fase 7 — HU-007-4 Orden de trabajo (P1)

- [x] T031 [HU-007-4] `EtapaOrdenTrabajoPage` (detalle, costo con `CampoMoneda`; acción solo con cotización Aprobada; texto "Esperando la respuesta del cliente") — `src/features/servicios/pages/EtapaOrdenTrabajoPage.tsx`

## Fase 8 — HU-007-5 Entrega (P1)

### Pruebas

- [x] T032 [P] [HU-007-5] Prueba de componente de `CampoVidaUtil` (sugerencia, chips, error si ≤ entrega) — `src/features/servicios/components/CampoVidaUtil.test.tsx`

### Implementación

- [x] T033 [P] [HU-007-5] `CampoVidaUtil` (`DateChip` + `Calendar` de la 003 con `minValue` = entrega + 1 día, chips +6/+12/+18/+24 m) — `src/features/servicios/components/CampoVidaUtil.tsx`
- [x] T034 [HU-007-5] `EtapaEntregaPage` (fecha, `AdjuntosEtapa` FOTO_SALIDA con `Min/MaxFotosSalida`, vida útil; variante sin reparación con vida útil opcional) — `src/features/servicios/pages/EtapaEntregaPage.tsx`

## Fase 9 — HU-007-6 Facturación (P1)

- [x] T035 [HU-007-6] `EtapaFacturacionPage` (`AdjuntoPdf` FACTURA, fecha, número con validación) — `src/features/servicios/pages/EtapaFacturacionPage.tsx`
      **Punto de control**: un servicio llega a FACTURADO offline cambiando de rol con auth mock.

## Fase 10 — HU-007-8 Anular y corregir (P2)

### Pruebas

- [x] T036 [P] [HU-007-8] Prueba de integración de `corregirCampos` (Admin ok sin cambio de estado y con `camposSucios`; no-Admin rechazado; fechas incoherentes rechazadas) — `src/application/servicios/corregirCampos.int.test.ts`

### Implementación

- [x] T037 [HU-007-8] `corregirCampos` — `src/application/servicios/corregirCampos.ts`
- [x] T038 [HU-007-8] `AccionesServicio` + `DialogoAnulacion` (`ResponsiveDialog`; motivo ≥ 10 caracteres en `TextField` multilínea, confirmación) y modo "Editar etapa" en `FormEtapa` para Admin — `src/features/servicios/components/`
- [x] T039 [HU-007-8] Ruta o diálogo de anulación según UX §2 — `src/features/servicios/pages/EtapaAnulacionPage.tsx`

## Fase 11 — HU-007-9 Mis trabajos por rol (P2)

- [x] T040 [HU-007-9] `TarjetasTrabajo` en Inicio: accesos del `QuickActionGrid` con badge numérico (usa `tarjetasPorRol` + `filtrarServicios`; enlaces a la lista filtrada; 3/4/6 columnas según el breakpoint) — `src/features/inicio/components/TarjetasTrabajo.tsx`

## Fase 12 — Cierre

- [ ] T041 E2E T-21 `ciclo-completo.spec.ts`: Técnico (diagnóstico) → Comercial (cotización aprobada) → Técnico (OT, entrega con 2 fotos) → Comercial (factura) hasta FACTURADO; caso DF; caso de entrega sin reparación; anulación por Admin; edición en `setOffline(true)`; axe sin violaciones serias (chromium-mobile, chromium-tablet, chromium-desktop, webkit-mobile). Agregar a `visual.spec.ts` las capturas de cada formulario de etapa, el detalle con carrusel e Inicio por rol — `tests/e2e/ciclo-completo.spec.ts`, `tests/e2e/visual.spec.ts`
- [ ] T042 Prueba en DEV real: un servicio recorre todas las etapas en dos dispositivos con usuarios de roles distintos, con sincronización entre etapas (aceptación de la F7). Anotar en `docs/pruebas/`
- [ ] T043 Medir CE-007-04 (tiempos por etapa) y anotarlo en la spec §8
- [ ] T044 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` (Unreleased) + ayuda in-app por etapa (`locales/es-CO/ayuda.json`) + spec → `Implementada` en `specs/README.md`

## Dependencias

- T009–T011 dependen de T004–T008. T014 depende de T009. T019 depende de T017.
- Fase 4 (PDF) bloquea las Fases 5, 6 y 9. Las Fases 6–9 siguen el orden del flujo, pero sus páginas son archivos distintos: T030, T031, T034 y T035 pueden avanzar en paralelo una vez terminadas las Fases 3 y 4.
- La spec 008 (correo de OT y alertas) consume los campos `otDetalle`, `otCostoReparacion` y `proyeccionVidaUtil` que deja esta spec.
