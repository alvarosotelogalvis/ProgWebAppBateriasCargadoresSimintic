# Tareas 008 — Alertas de vida útil y notificaciones

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-008-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(008): T### …`.
- **Precondición**: spec 007 implementada (OT y entrega con vida útil), 005/006 (sincronización) y tenant DEV con las listas de `docs/06` §2 (incluidas `OTCorreoEnviado`, `AlertaVidaUtilNivel` y las claves de `ConfiguracionApp`).

## Fase 1 — Preparación

- [ ] T001 Confirmar con el usuario PA-04, PA-05 y la aceptación de Power Automate (spec §8). Pasar ADR-0013 a `Aceptado` si se confirma. Crear la rama y marcar la spec como `En implementación` — `specs/008-alertas-notificaciones/spec.md`, `docs/adr/0013-notificaciones-power-automate.md`, `specs/README.md`
- [ ] T002 [P] Crear el namespace i18n `alertas` (pestañas, "Venció hace N días", "Vence en N días", estados vacíos, tarjeta de Inicio) — `src/locales/es-CO/alertas.json`
- [ ] T003 [P] Seed de desarrollo con servicios en cada nivel (vencido, 0, 20, 45, 80, 120 días; anulado; DF; sin proyección) — `scripts/seed-dev.ts`

## Fase 2 — Fundamentos de dominio

### Pruebas

- [ ] T004 [P] Pruebas de `diasRestantes`, `calcularNivelAlerta` (−1, 0, 30, 31, 60, 90, 91; umbrales desordenados; umbrales personalizados 120/60/15), `agruparAlertas` y `porcentajeVidaConsumida` (0–100, vencida → 100, sin fecha de entrega → null) — `src/domain/alertas.test.ts`
- [ ] T005 [P] [HU-008-5] Prueba del mapper: `aCamposSP` nunca incluye `OTCorreoEnviado` ni `AlertaVidaUtilNivel`, y `deCamposSP` no los convierte en campos de dominio (no entran en el merge) — `src/infrastructure/graph/mappers/servicioMapper.test.ts`
- [ ] T006 [P] Pruebas de `obtenerAlertas` (exclusiones, filtro por cliente, configuración inválida → 90/60/30) — `src/application/alertas/obtenerAlertas.test.ts`

### Implementación

- [ ] T007 Completar `domain/alertas.ts` hasta pasar T004 — `src/domain/alertas.ts`
- [ ] T008 [HU-008-5] Ajustar el mapper si T005 falla — `src/infrastructure/graph/mappers/servicioMapper.ts`
- [ ] T009 `obtenerAlertas` — `src/application/alertas/obtenerAlertas.ts`

## Fase 3 — HU-008-1 Alertas en la app (P1) 🎯 MVP

### Pruebas

- [ ] T010 [P] [HU-008-1] Prueba de componente de `AlertasPage` (pestañas dinámicas con contador, filtro persistente, orden por días, navegación al detalle, estado vacío) — `src/features/alertas/pages/AlertasPage.test.tsx`

### Implementación

- [ ] T011 [HU-008-1] `useAlertas` (useLiveQuery de servicios + config + `Clock`) — `src/features/alertas/hooks/useAlertas.ts`
- [ ] T012 [P] [HU-008-1] `FilaAlerta` como fila de `BarList` (spec 005): código · cliente · serie, barra = % de vida útil consumida (`accent`; `--danger` si está vencida), valor = días con texto + fecha proyectada + badge de nivel con ícono — `src/features/alertas/components/FilaAlerta.tsx`
- [ ] T013 [HU-008-1] `AlertasPage` estilo de la referencia 06 (`Card fill` + `h2`, `SegmentedControl` con las pestañas dinámicas, `ComboboxField` de cliente en un `ResponsiveDialog` en compacto o en línea en medio/expandido, lista virtualizada si hay más de 100, 2 columnas en expandido) y ruta `/alertas` (lazy) — `src/features/alertas/pages/AlertasPage.tsx`, `src/app/router.tsx`
      **Punto de control**: ES-008-01…08 pasan offline con el seed.

## Fase 4 — HU-008-2 Resumen en Inicio (P2)

- [ ] T014 [HU-008-2] `TarjetaAlertas`: acceso "Alertas" con badge (Vencidas N · ≤ menor umbral M) en el `QuickActionGrid` en compacto/medio y panel "Alertas próximas" (`BarList` con las 5 más urgentes, 7 col. junto a la `SummaryCard`) en expandido → `/alertas` — `src/features/inicio/components/TarjetaAlertas.tsx`

## Fase 5 — HU-008-3 y HU-008-4 Automatizaciones (P1) — entregable fuera del código

> Estas tareas se hacen en el portal de Power Automate junto con el administrador del tenant, en el ambiente **DEV**.

- [ ] T015 [HU-008-3] Crear el flujo "ServicioTec – Correo OT" según `docs/06` §3.1 (condición del desencadenador, lectura de `CorreoDestinoOT`, cuerpo HTML con todos los campos de ES-008-11, `OTCorreoEnviado = Sí` solo si el envío fue exitoso, rama de error con aviso al propietario). Guardar la plantilla del cuerpo — `docs/powerautomate/plantilla-correo-ot.html`
- [ ] T016 [HU-008-4] Crear el flujo "ServicioTec – Alertas de vida útil" según `docs/06` §3.2, con la regla de niveles **idéntica** a `calcularNivelAlerta` (tabla de casos de T004), paginación activada, actualización sin notificar cuando el nivel baja y un único correo resumen
- [ ] T017 [HU-008-3] Asignar una cuenta de servicio o un segundo copropietario a ambos flujos
- [ ] T018 [HU-008-3] [HU-008-4] Pruebas manuales en DEV (`docs/06` §3.3 + ES-008-12, 13, 15, 16): OT una sola vez; corrección sin reenvío; destinatario inválido → aviso; nivel 30 sin repetición; paso a Vencida notifica una vez; sin cambios → sin correo. Registrar los resultados — `docs/pruebas/flujos-AAAA-MM-DD.md`
- [ ] T019 Exportar ambos flujos como paquetes y documentar la importación, las conexiones, los propietarios, las diferencias DEV/PRD, la regla de niveles, cómo reenviar un correo de OT (poner `OTCorreoEnviado = No`) y la revisión mensual de ejecuciones — `docs/powerautomate/README.md`, `docs/powerautomate/*.zip`

## Fase 6 — Cierre

- [ ] T020 E2E `alertas-offline.spec.ts`: seed → `setOffline(true)` → pestañas y contadores correctos → filtro por cliente → detalle → axe sin violaciones serias (chromium-mobile, chromium-tablet, chromium-desktop, webkit-mobile). Agregar a `visual.spec.ts` las capturas de Alertas y del panel de Inicio en 360/768/1280 — `tests/e2e/alertas-offline.spec.ts`, `tests/e2e/visual.spec.ts`
- [ ] T021 Prueba de extremo a extremo en DEV real: desde la app, pasar un servicio a En reparación → sincronizar → correo recibido en ≤ 10 min (CE-008-03); entregar con la vida útil = hoy + 20 → ejecutar el flujo diario manualmente → correo nivel 30. Anotar en `docs/pruebas/`
- [ ] T022 Agregar a la ayuda in-app la explicación de alertas y correos ("el correo de OT llega al sincronizar") — `src/locales/es-CO/ayuda.json`
- [ ] T023 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` (Unreleased) + spec → `Implementada` en `specs/README.md`

## Dependencias

- T007 depende de T004. T009 depende de T006 y T007. T013 depende de T010–T012.
- Las Fases 3–4 (código) y la Fase 5 (flujos) son independientes y pueden avanzar en paralelo una vez terminada la Fase 2. T016 depende de T004 (la tabla de casos es la referencia).
- La creación de los flujos en **PRD** se hace en la F10 importando los paquetes de T019.
