# Plan 007 — Etapas del servicio y roles

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §5.1 (máquina de estados), §5.2 (validación), §8.5 (autorización en la app), §10 (archivos), §12 (UI) · Modelo de datos §2.3–§2.7, §3.1, §4, §5, §6.3 · UX §3.3, §3.5, §3.6, §3.7 · **Sistema de diseño `docs/10` §3, §4.3, §6 (referencias 03, 04, 05, 10), §7** · ADR 0006, 0011, 0012, **0022**

## 1. Contexto técnico

| Aspecto              | Valor                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003)                                                                                                                                                                                                                                                                                                                                                                         |
| UI                   | Sistema de diseño de la spec 001 (React Aria Components + CSS Modules + tokens, ADR-0022). Esta spec **agrega** al catálogo: `AmountInput` (COP, referencia 10) y `PhotoCarousel` (referencia 05). Reutiliza `TextField`, `SelectField`, `ComboboxField`, `DateChip`/`Calendar` (spec 003), `PhotoGallery`, `Card`, `CardInner`, `ResponsiveDialog`, `Banner`, `QuickActionGrid`, `SummaryCard` y `StatusBadge` |
| Almacenamiento       | Dexie: `servicios`, `adjuntos`, `catalogos` (`choices:Diagnostico`, `config`)                                                                                                                                                                                                                                                                                                                                   |
| Integraciones        | Ninguna remota en esta spec. La subida de los campos nuevos la hace el `SyncEngine` de la 005 mediante los mappers (verificar que cubran todas las columnas de §2.3–§2.7)                                                                                                                                                                                                                                       |
| Librerías nuevas     | Ninguna                                                                                                                                                                                                                                                                                                                                                                                                         |
| Pruebas              | Vitest + fake-indexeddb · Testing Library · Playwright con auth mock por rol y Graph interceptado (T-21)                                                                                                                                                                                                                                                                                                        |
| Plataformas          | PRD §11                                                                                                                                                                                                                                                                                                                                                                                                         |
| Desempeño            | Validación de transición < 50 ms; formularios con autoguardado con debounce de 800 ms (igual que la 003)                                                                                                                                                                                                                                                                                                        |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I Offline primero           | ✅       | Todo se lee y escribe en Dexie. Los catálogos de diagnóstico y la configuración vienen del caché                                                                                                                                                                                                                      |
| II Cero pérdida             | ✅       | Autoguardado por etapa. Reemplazar un PDF elimina el anterior **en la misma transacción** en la que guarda el nuevo. Un adjunto ya sincronizado se marca `eliminarRemoto` (no se borra hasta el push). La anulación no borra nada (T009)                                                                              |
| III Sin backend ni secretos | ✅       | Sin red                                                                                                                                                                                                                                                                                                               |
| IV Identidad confirmada     | ✅       | Sin escritura remota. Los roles salen del token cacheado (`useRoles`)                                                                                                                                                                                                                                                 |
| V Idempotencia              | ✅       | Los adjuntos nuevos usan UUID local. Las transiciones son funciones puras sobre el estado                                                                                                                                                                                                                             |
| VI Dominio puro             | ✅       | Transiciones, requisitos, `camposEditables`, validaciones cruzadas, sugerencia de vida útil y tarjetas por rol en `domain/`. Casos de uso en `application/`                                                                                                                                                           |
| VII Pruebas primero         | ✅       | T004–T011 antes de la implementación del dominio y la aplicación. Las pruebas de componente preceden a cada formulario                                                                                                                                                                                                |
| VIII Accesible y es-CO      | ✅       | Los mismos patrones del formulario de recepción (etiquetas, foco al primer error, lista de faltantes). `AmountInput` sobre RAC `NumberField` con `formatOptions` es-CO COP. `PhotoCarousel` navegable con teclado y anunciado ("Foto 2 de 5"). Solo tokens y componentes de `docs/10`. axe y capturas en 360/768/1280 |
| IX Seguridad                | ✅       | PDF validado por firma y no renderizado dentro de la app (visor del sistema vía object URL). Sin HTML dinámico                                                                                                                                                                                                        |
| X Simplicidad               | ✅       | Un componente genérico `FormEtapa` + campos por etapa, en lugar de 6 formularios independientes con lógica duplicada                                                                                                                                                                                                  |
| XI Trazabilidad             | ✅       | FR → RF en la spec; tareas con IDs de historia                                                                                                                                                                                                                                                                        |

## 3. Diseño de la funcionalidad

### 3.1 Archivos

```
src/domain/
  estados.ts                 # (spec 002) completar TRANSICIONES de docs/03 §5 si faltara alguna; camposEditables con regla Admin
  validaciones.ts            # esquemaDiagnostico, esquemaDisposicionFinal, esquemaCotizacion, esquemaOrdenTrabajo,
                             # esquemaEntrega, esquemaEntregaSinReparacion, esquemaFacturacion, esquemaAnulacion
  fechas.ts                  # NUEVO: validacionesCruzadasFechas(servicio) → ErrorValidacion[]
  vidaUtil.ts                # NUEVO: sugerirVidaUtil(fechaEntrega, meses)
  tarjetasInicio.ts          # NUEVO: tarjetasPorRol(roles) → { clave, filtro: FiltroServicios }[]
  pdf.ts                     # NUEVO: esFirmaPdf(primerosBytes: Uint8Array): boolean
src/application/
  servicios/completarEtapa.ts     # (spec 002) — se reutiliza
  servicios/cambiarRespuestaCotizacion.ts   # NUEVO
  servicios/anularServicio.ts     # (spec 002 'anular') — se reutiliza o completa
  servicios/corregirCampos.ts     # NUEVO: corrección Admin sin cambio de estado
  adjuntos/agregarPdf.ts          # NUEVO: valida firma y tamaño, reemplaza si la etapa admite 1
  adjuntos/agregarFoto.ts         # (spec 003) — se reutiliza con FOTO_SALIDA
src/features/servicios/
  components/FormEtapa.tsx               # NUEVO: contenedor genérico (Card fill / 720 / 960 en 2 columnas; autoguardado, faltantes, PrimaryButton de acción, solo lectura)
  components/CampoDiagnostico.tsx        # SelectField desde choices:Diagnostico (+ "valor anterior")
  components/CampoMoneda.tsx             # envoltorio de AmountInput (COP fijo a la izquierda, monto grande a la derecha)
  components/CampoVidaUtil.tsx           # DateChip + Calendar + chips +6/+12/+18/+24 m (SegmentedControl o Chip)
  components/CabeceraServicio.tsx        # NUEVO: PhotoCarousel (fotos de ingreso y salida) + código + StatusBadge
  components/AccionesServicio.tsx        # Anular (Admin), Editar etapa (Admin)
  components/DialogoAnulacion.tsx        # ResponsiveDialog
  pages/EtapaDiagnosticoPage.tsx
  pages/EtapaCotizacionPage.tsx
  pages/EtapaOrdenTrabajoPage.tsx
  pages/EtapaEntregaPage.tsx
  pages/EtapaFacturacionPage.tsx
  pages/EtapaAnulacionPage.tsx           # o diálogo, según la ruta de UX §2
  components/LineaTiempoEtapas.tsx       # (spec 003) — ampliar con resumen por etapa y "Pendiente de <rol>"
src/features/adjuntos/components/
  AdjuntoPdf.tsx                         # NUEVO: CardInner centrada (vista previa, referencia 10) + ícono picture_as_pdf + nombre + tamaño + Ver / Reemplazar / Eliminar
src/features/inicio/components/
  TarjetasTrabajo.tsx                    # NUEVO: accesos con badge numérico en el QuickActionGrid de Inicio, por rol
src/shared/ui/                           # se agregan al catálogo (docs/10 §3) y a /tecnico/ui
  AmountInput.tsx                        # RAC NumberField, formato es-CO COP, maximumFractionDigits 0
  PhotoCarousel.tsx                      # RAC GridList horizontal, flechas accent chevron_left/right (referencia 05)
src/locales/es-CO/etapas.json
tests/e2e/ciclo-completo.spec.ts
tests/fixtures/pdf/{valido-200kb.pdf, grande-25mb.pdf, falso.pdf}
```

### 3.2 Contratos

```ts
// domain/estados.ts (extensión)
export function camposEditables(s: Servicio, roles: Rol[]): Set<keyof CamposServicio>;
// - Campos de la etapa actual: editables por los roles de la transición siguiente.
// - Campos de etapas completadas y de estados finales: solo si roles incluye 'Administrador'.
// - Nunca: id, codigo (derivado), capturadoPor, estado (cambia solo por transición).

// domain/fechas.ts
export function validacionesCruzadasFechas(
  s: Partial<CamposServicio>,
  hoy: string
): ErrorValidacion[];

// domain/vidaUtil.ts
export function sugerirVidaUtil(fechaEntrega: string, meses: number): string; // yyyy-MM-dd

// domain/tarjetasInicio.ts
export function tarjetasPorRol(roles: Rol[]): TarjetaInicio[]; // sin duplicados, orden estable

// application/adjuntos/agregarPdf.ts
export type TipoPdf = 'FORMATO_DIAGNOSTICO' | 'DISPOSICION_FINAL' | 'COTIZACION' | 'FACTURA';
export type AgregarPdfResultado =
  | { ok: true; adjunto: Adjunto; reemplazado?: string }
  | { ok: false; error: 'NO_ES_PDF' | 'TAMANO_EXCEDIDO' | 'ALMACENAMIENTO_LLENO' };

// application/servicios/corregirCampos.ts
export function crearCorregirCampos(
  deps
): (servicioId: string, cambios: Partial<CamposServicio>, roles: Rol[]) => Promise<void>;
// lanza AppError('VALIDACION') si no es Admin o si violan las validaciones cruzadas

// application/servicios/cambiarRespuestaCotizacion.ts
export function crearCambiarRespuestaCotizacion(
  deps
): (servicioId: string, respuesta: EstadoCotizacion, roles: Rol[]) => Promise<void>;
// solo en estado COTIZADO, roles Comercial | Administrador
```

### 3.3 Flujo de una etapa (genérico, `FormEtapa`)

```
1. Cargar el servicio y sus adjuntos (useLiveQuery) + roles (useRoles) + config
2. editables = camposEditables(s, roles) → los campos fuera del conjunto se muestran en solo lectura
3. Cada cambio → useAutoguardado → actualizarCampos (o corregirCampos si la etapa ya está completada y es Admin)
4. disponibles = transicionesDisponibles(s, roles, adjuntos, cfg)
   - sin transición para el rol → "Pendiente de <rol>"
   - con transición y errores → botón deshabilitado + lista de faltantes (claves i18n)
5. Acción → completarEtapa(hacia) → navegar al detalle
   - para DISPOSICION_FINAL: diálogo de confirmación previo ("Se cerrará sin reparación")
```

### 3.4 Decisiones locales

- **Disposición final**: `esDisposicionFinal = diagnostico === cfg.DiagnosticoValorDisposicionFinal`. Si ese valor no existe en `choices:Diagnostico`, se oculta la rama y se registra `logger.warn('config.df_invalido')`.
- **Cambio de rama DF → normal**: al completar como DIAGNOSTICADO, el caso de uso limpia `fechaSocializacionDF` y elimina el adjunto `DISPOSICION_FINAL` (con la confirmación pedida en la UI). Así no viajan datos incoherentes a SharePoint.
- **Reemplazo de PDF de cardinalidad 1** (`FORMATO_DIAGNOSTICO`, `DISPOSICION_FINAL`, `COTIZACION`, `FACTURA`): el nuevo se guarda y el anterior se elimina (local) o se marca `eliminarRemoto` (sincronizado), todo en una transacción.
- **Firma PDF**: se leen los primeros 1024 bytes (`blob.slice(0, 1024).arrayBuffer()`) y se busca `%PDF-` (algunos PDF traen bytes basura antes de la cabecera). El tamaño máximo sale de `cfg.MaxTamanoPdfMB`.
- **Moneda**: se guarda como `number` entero (COP). `AmountInput` (RAC `NumberField` con `formatOptions: { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }` y locale es-CO) acepta los separadores locales y formatea al perder el foco. Estilo de la referencia 10: "COP" en `primary` a la izquierda y el monto en `amount-xl` a la derecha.
- **Fechas**: todas las fechas de etapa (socialización DF, envío de la cotización, entrega, factura, vida útil) usan `DateChip` + `Calendar` (spec 003) con `minValue`/`maxValue` según las validaciones cruzadas. Esto reemplaza la idea anterior de usar `input type="date"` nativo en táctil: el calendario de la referencia 08 se muestra en un `ResponsiveDialog` (Sheet) en compacto.
- **Estilo por pantalla** (`docs/10` §6):
  - _Formularios de etapa_ ← referencia 03: `Card fill` con `h2` ("Diagnóstico", "Cotización", "Orden de trabajo", "Entrega", "Facturación"), campos con etiqueta, adjuntos, `PrimaryButton` de la transición ("COMPLETAR DIAGNÓSTICO", "REGISTRAR COTIZACIÓN", …) y `SecondaryButton` "CANCELAR". La DF muestra un `Banner` de advertencia "Se cerrará el registro sin reparación".
  - _Cotización y OT_ ← referencia 10: `AmountInput` para `cotizacionValor` y `otCostoReparacion`. `AdjuntoPdf` con la vista previa en un `CardInner` centrado y `TextLink` "Abrir en SharePoint" para los remotos.
  - _Detalle_ ← referencia 05: `CabeceraServicio` con `PhotoCarousel` (fotos de ingreso + salida, flechas `accent`) arriba y la `Card` con los datos y la `LineaTiempoEtapas` debajo, pegada a la BottomNav en compacto.
  - _Inicio_ ← referencia 04: `TarjetasTrabajo` como accesos del `QuickActionGrid` con badge (Recibidos, En reparación, Por facturar…, según el rol) y `SummaryCard` sin cambios.
- **Adaptación por breakpoint** (`docs/10` §4.3, §7.3): formularios en `Card fill` (compacto) → `Card` de 720 (medio) → `Card` de 960 con campos en **2 columnas**, textos largos (`observacionTecnica`, `otDetalle`) a 12 columnas (expandido). En expandido, el formulario de etapa se abre dentro del panel de detalle del `ListaDetalleLayout` (spec 003). `DialogoAnulacion`: Sheet en compacto y modal en medio/expandido. `PhotoCarousel`: 1 foto visible en compacto, 3 en medio y 5 en expandido.
- **Entrega sin reparación**: `esquemaEntregaSinReparacion` hace la vida útil opcional. La tabla de transiciones distingue `COTIZADO → ENTREGADO` (rechazada) de `EN_REPARACION → ENTREGADO`.
- **Tarjetas de Inicio**: los contadores se calculan con `filtrarServicios` (spec 003) sobre `useLiveQuery`, sin consultas nuevas.
- **Rutas**: `/servicios/:id/etapa/:etapa` con `etapa ∈ {diagnostico, cotizacion, orden-trabajo, entrega, facturacion, anulacion}` (UX §2). Un `RoleGuard` por etapa redirige al detalle con "Sin permiso".

## 4. Estrategia de pruebas

| Nivel  | Qué                                                                                                                                                                              | Archivo                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Unit   | Cada transición nueva: válida, falta requisito, rol incorrecto (100 % de la tabla, T-01)                                                                                         | `src/domain/estados.test.ts`                                                  |
| Unit   | `camposEditables` por estado × rol (matriz completa)                                                                                                                             | `src/domain/estados.camposEditables.test.ts`                                  |
| Unit   | Esquemas por etapa; `validacionesCruzadasFechas`; `sugerirVidaUtil` (fin de mes, año bisiesto)                                                                                   | `src/domain/validaciones.test.ts`, `fechas.test.ts`, `vidaUtil.test.ts`       |
| Unit   | `esFirmaPdf` (válido, falso, cabecera desplazada); `tarjetasPorRol`                                                                                                              | `src/domain/pdf.test.ts`, `tarjetasInicio.test.ts`                            |
| Int    | `agregarPdf`: ok, NO_ES_PDF, TAMANO_EXCEDIDO, reemplazo local vs. sincronizado (`eliminarRemoto`)                                                                                | `src/application/adjuntos/agregarPdf.int.test.ts`                             |
| Int    | `corregirCampos`: Admin ok sin cambio de estado; no-Admin rechazado; fechas incoherentes rechazadas                                                                              | `…/corregirCampos.int.test.ts`                                                |
| Int    | `cambiarRespuestaCotizacion` y la rama DF → normal que limpia datos                                                                                                              | `…/cambiarRespuestaCotizacion.int.test.ts`, `…/completarEtapa.df.int.test.ts` |
| Comp   | `FormEtapa`: solo lectura por rol, "Pendiente de <rol>", faltantes, confirmación DF                                                                                              | `src/features/servicios/components/FormEtapa.test.tsx`                        |
| Comp   | `AdjuntoPdf`, `CampoMoneda`, `CampoVidaUtil`                                                                                                                                     | `…/*.test.tsx`                                                                |
| Comp   | `AmountInput` (formato COP, separadores es-CO, valor numérico entero) y `PhotoCarousel` (teclado, anuncio "Foto n de m", flechas)                                                | `src/shared/ui/AmountInput.test.tsx`, `PhotoCarousel.test.tsx`                |
| Visual | Formularios de cada etapa, detalle con carrusel e Inicio por rol en 360/768/1280                                                                                                 | `tests/e2e/visual.spec.ts`                                                    |
| E2E    | T-21: ciclo completo Técnico → Comercial → Técnico → Comercial hasta FACTURADO; rama DF; entrega sin reparación; anulación (auth mock por rol, offline durante la edición) + axe | `tests/e2e/ciclo-completo.spec.ts`                                            |

## 5. Riesgos

| Riesgo                                                             | Mitigación                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Los supuestos PA-02 y PA-03 no coinciden con el negocio            | Confirmarlos antes de la F7 (Fase 1 de las tareas). La tabla de transiciones aísla el cambio                                 |
| Los mappers de la 005 no incluyen todas las columnas de las etapas | Tarea T012 de verificación de ida y vuelta para todos los campos de §2.3–§2.7                                                |
| El calendario en un popover es incómodo en móvil                   | `DateChip` abre el `Calendar` en un `ResponsiveDialog` (Sheet inferior) en compacto, con objetivos de 44 px (`docs/10` §2.3) |
| La lógica de rol solo está en la UI                                | Riesgo aceptado (ADR-0018). Versionado de SharePoint para auditoría                                                          |

## 6. Seguimiento de complejidad

| Desviación                                                                           | Por qué                                                                                                                                                                                                       | Alternativa simple rechazada                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `FormEtapa` genérico y `CabeceraServicio` no se implementaron como estaban planeados | Cada etapa tiene campos muy distintos; un contenedor genérico no aportaba. Se compartió solo lo común (`useCompletarEtapa`, `FaltantesEtapa`, estilos de `EtapaPage`). El detalle ya tenía cabecera y galería | Un `FormEtapa` que renderice campos por configuración |
