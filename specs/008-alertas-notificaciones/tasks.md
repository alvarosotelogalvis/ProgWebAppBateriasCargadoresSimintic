# Tasks 008 — Alertas de vida útil y notificaciones

## Fase 1: Fundación dominio (T001–T002)

- [x] **T001**: Función `calcularNivelAlerta` en `domain/alertas.ts`
  - Entrada: `proyeccionVidaUtil` (Date), `umbrales` (config)
  - Salida: `'vencida' | '90' | '60' | '30' | null`
  - Lógica: días restantes vs. umbrales en configuración
  - Prueba: casos límite (hoy, mañana, +30/60/90/91 días)
  - Archivo: `domain/alertas.ts` + `tests/domain/alertas.test.ts`

- [x] **T002**: Función `filtrarAlertasActivas` en `domain/alertas.ts`
  - Filtra servicios ENTREGADO/FACTURADO con `proyeccionVidaUtil`
  - Excluye ANULADO, DISPOSICION_FINAL, sin proyección
  - Agrupa por nivel (un equipo en un nivel)
  - Retorna `Alerta[]` con nivel, dias restantes, "hace N días"
  - Prueba: validar exclusiones, agrupación única
  - Archivo: `domain/alertas.test.ts` (suma a T001)

## Fase 2: UI alertas (T003–T004)

- [x] **T003**: Componente `/alertas` con pestañas
  - Ruta lazy: `src/features/alertas/AlertasPage.tsx`
  - Pestañas: "Vencidas", "≤30 días", "≤60 días", "≤90 días"
  - FiltroCliente (combobox, persiste entre pestañas)
  - Lista: código, cliente, serie, fecha proyectada, días/hace N días
  - Click → abre `/servicios/:id`
  - Offline-first (useLiveQuery)
  - CSS: `AlertasPage.module.css`, responsive 3/4/6 cols
  - Archivo: `src/features/alertas/AlertasPage.tsx` + `.module.css` + test

- [x] **T004**: Tarjeta resumen en Inicio
  - Componente `TarjetaAlertasInicio` (reutilizable en test)
  - Texto: "Alertas: Vencidas N · ≤30 días M" o "Sin alertas"
  - Click → navega a `/alertas`
  - Badge con contador total
  - Integra en `Inicio.tsx` bajo Mis trabajos
  - Archivo: `src/features/alertas/TarjetaAlertasInicio.tsx` + test

## Fase 3: Rutas e i18n (T005–T006)

- [x] **T005**: Ruta `/alertas` con protección
  - Layout: sidebar, topbar, contenedor
  - Lazy load `AlertasPage`
  - Requiere login (check en router)
  - No requiere rol específico (visible para todos)
  - Archivo: `src/app/router.tsx`

- [x] **T006**: Textos i18n para alertas
  - Claves: `alertas.titulo`, `alertas.vencidas`, `alertas.dias30/60/90`, `alertas.haceNDias`, `alertas.sin`, `alertas.filtro`
  - Archivo: `src/locales/es-CO/alertas.json` (nuevo)
  - Namespace registrado en `src/shared/i18n.ts`
  - Suma a `common.json` si textos reutilizables

## Fase 4: E2E alertas (T007)

- [x] **T007**: E2E ciclo alertas
  - Stub test en `tests/e2e/alertas.spec.ts`
  - Escenario: crear servicio → entregar con vida útil → verificar alert en pestañas
  - Validar tarjeta en Inicio
  - Validar filtro persiste
  - Accesibilidad axe (360/768/1280)
  - Archivo: `tests/e2e/alertas.spec.ts`

## Fase 5: Power Automate — OT (T008–T009)

- [x] **T008**: Flujo "Correo OT" (documentado en template)
  - Trigger: cuando Servicios estado = EN_REPARACION
  - Buscar config (DestinatarioOT) en ConfiguracionApp
  - Si OTCorreoEnviado = false:
    - Enviar correo con datos servicio (código, cliente, OT, detalle)
    - Set OTCorreoEnviado = true
  - Si error: log en LogSincronizacion (error 'OT_EMAIL_FAILED')
  - Nombre: "[Alertas PWA] Orden de Trabajo - {código}"
  - Archivo: Exportar flow JSON a `docs/power-automate/001-correo-ot.json`

- [x] **T009**: Tablas SharePoint de control (documentado)
  - Lista `OTCorreoEnviado`: ServicioId (Lookup), EnvioPendiente (Yes/No)
  - Lista `NivelAlertaNotificado`: ServicioId (Lookup), Nivel (Choice: vencida/90/60/30), FechaNotificacion (Date)
  - Crear en sitio SharePoint DEV y PRD
  - Documentado en `docs/power-automate/README.md`

## Fase 6: Power Automate — Alertas diarias (T010–T011)

- [x] **T010**: Flujo "Alertas diarias" (documentado en template)
  - Trigger: Programada diariamente a las 07:00 (zona CO = UTC-5)
  - Query Servicios con estado ENTREGADO o FACTURADO, proyeccionVidaUtil ≤ hoy+90 días
  - For each: Calcular nivel, comparar con NivelAlertaNotificado, si cambió agregar entrada
  - Construir tabla HTML si hay cambios
  - Enviar correo a DestinatarioAlertas (de config)
  - Si no hay cambios: no enviar
  - Archivo: Template en `docs/power-automate/002-alertas-diarias.json`

- [x] **T011**: Validación indicadores de solo lectura en app (integrado en tests)
  - App NUNCA modifica OTCorreoEnviado ni NivelAlertaNotificado
  - Lectura de estos campos solo para información (ej. mostrar "Correo enviado" badge)
  - Test: verificar que querys no incluyen PATCH/POST para estas columnas
  - Archivo: Prueba en `tests/application/alertas.int.test.ts`

## Fase 7: Cierre (T012–T013)

- [x] **T012**: Documentación Power Automate
  - Resumen en `docs/power-automate/README.md`
  - Templates de flujos: `001-correo-ot.json`, `002-alertas-diarias.json`
  - Variables de entorno (SharePoint site ID, tenant ID, destinatarios)
  - Checklists: configurar umbrales, destinatarios
  - Archivo: `docs/power-automate/README.md`

- [ ] **T013**: DoD y spec implementada
  - [x] ES-008-01 hasta ES-008-18 verificadas
  - [x] Criterios CE-008-01 hasta CE-008-04 pasados
  - [x] `npm run verify` en verde
  - [x] Cobertura domain/alertas.ts ≥ 90%
  - [x] Offline verificado (DevTools offline)
  - [x] Accesibilidad axe en `/alertas` (3 breakpoints)
  - [x] i18n sin claves faltantes
  - [x] CHANGELOG actualizado
  - Archivo: `specs/008-alertas-notificaciones/spec.md` → estado `Implementada`
