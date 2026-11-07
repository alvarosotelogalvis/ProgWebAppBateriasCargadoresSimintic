# Plan 008 — Alertas de vida útil y notificaciones

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §5 (`domain/alertas.ts`), §7.4 (mappers: campos que nunca se envían), §12 (UI), §16.3 (config remota) · Modelo de datos §2.5, §2.6, §6.3 · UX §3.3, §3.10 · **Sistema de diseño `docs/10` §3, §4.3, §6 (referencias 04 y 06)** · `docs/06` §3 (flujos) · ADR 0013, 0017, **0022**

## 1. Contexto técnico

| Aspecto              | Valor                                                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003)                                                                                                                                                                                                                                          |
| UI                   | Sistema de diseño de la spec 001 (React Aria Components + CSS Modules + tokens, ADR-0022). Reutiliza `SegmentedControl` (001), `BarList` (005), `ComboboxField` (003), `Card`, `ListRow`, `EmptyState`, `QuickActionGrid` y `SummaryCard`. Sin componentes nuevos en el catálogo |
| Almacenamiento       | Dexie: `servicios`, `catalogos` (`clientes`, `config`)                                                                                                                                                                                                                           |
| Integraciones        | **Power Automate** (M365, conectores estándar SharePoint + Office 365 Outlook): flujos "ServicioTec – Correo OT" y "ServicioTec – Alertas de vida útil". **No es código del repositorio**: se crean en el portal y se exportan                                                   |
| Librerías nuevas     | Ninguna (`date-fns` ya está en el stack)                                                                                                                                                                                                                                         |
| Pruebas              | Vitest (dominio y aplicación) · Testing Library · Playwright (pantalla de alertas offline) · pruebas manuales de los flujos (`docs/06` §3.3)                                                                                                                                     |
| Plataformas          | PRD §11                                                                                                                                                                                                                                                                          |
| Desempeño            | Cálculo de alertas en memoria sobre `useLiveQuery`, < 1 s con 500 servicios                                                                                                                                                                                                      |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                                                                                                                                                                                       |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I Offline primero           | ✅       | Las alertas de la app son un cálculo local. Los correos son responsabilidad de M365 y no bloquean la app                                                                                                                                                                                   |
| II Cero pérdida             | ✅       | Solo lectura en la app. Sin escrituras ni purgas nuevas                                                                                                                                                                                                                                    |
| III Sin backend ni secretos | ✅       | Power Automate es la excepción prevista explícitamente en el Artículo III (ADR-0013). Sin servidores propios. La app no obtiene permisos nuevos (no usa `Mail.Send`)                                                                                                                       |
| IV Identidad confirmada     | ✅       | La app no escribe nada nuevo. Los flujos actúan con la conexión de su propietario (cuenta de servicio o copropietarios) sobre datos ya subidos por usuarios confirmados                                                                                                                    |
| V Idempotencia              | ✅       | `OTCorreoEnviado` evita repetir el correo de OT. `AlertaVidaUtilNivel` evita repetir el mismo nivel. Las condiciones del desencadenador impiden los bucles                                                                                                                                 |
| VI Dominio puro             | ✅       | `calcularNivelAlerta` y `agruparAlertas` son funciones puras en `domain/alertas.ts`                                                                                                                                                                                                        |
| VII Pruebas primero         | ✅       | T004–T006 antes de T007–T011                                                                                                                                                                                                                                                               |
| VIII Accesible y es-CO      | ✅       | Pestañas (`SegmentedControl`) con contador accesible ("Vencidas, 3 equipos"), barras de `BarList` con `role="meter"` y valor textual (días restantes y fecha), vencidas en `--danger` **más** texto e ícono (nunca solo color), textos i18n, días en es-CO. axe y capturas en 360/768/1280 |
| IX Seguridad                | ✅       | Los correos solo van a destinatarios internos configurados por un administrador. Sin datos de clientes enviados fuera                                                                                                                                                                      |
| X Simplicidad               | ✅       | Sin almacenar alertas: se derivan en cada render                                                                                                                                                                                                                                           |
| XI Trazabilidad             | ✅       | FR → RF en la spec. Los flujos se exportan a `docs/powerautomate/` y quedan documentados                                                                                                                                                                                                   |

## 3. Diseño de la funcionalidad

### 3.1 Archivos

```
src/domain/
  alertas.ts                       # (spec 002) completar: calcularNivelAlerta, agruparAlertas, diasRestantes
src/application/alertas/
  obtenerAlertas.ts                # filtra estados, aplica umbrales de config, filtro por cliente
src/infrastructure/graph/mappers/
  servicioMapper.ts                # (spec 005) verificar exclusión de OTCorreoEnviado / AlertaVidaUtilNivel en aCamposSP y deCamposSP
src/features/alertas/
  pages/AlertasPage.tsx            # referencia 06: Card fill + h2 + SegmentedControl (pestañas dinámicas) + ComboboxField de cliente + BarList
  components/FilaAlerta.tsx        # fila de BarList: código · cliente, barra = % de vida útil consumida, valor = días restantes + fecha
  hooks/useAlertas.ts              # useLiveQuery + obtenerAlertas
src/features/inicio/components/
  TarjetaAlertas.tsx               # acceso "Alertas" con badge en el QuickActionGrid (compacto/medio) y panel "Alertas próximas" (BarList con las 5 más urgentes) en expandido
src/locales/es-CO/alertas.json
tests/e2e/alertas-offline.spec.ts
docs/powerautomate/
  README.md                        # cómo importar, conexiones, propietarios, variables por ambiente
  ServicioTec-CorreoOT_DEV.zip     # export del flujo (paquete)
  ServicioTec-AlertasVidaUtil_DEV.zip
  plantilla-correo-ot.html         # cuerpo del correo (referencia)
```

### 3.2 Contratos

```ts
// domain/alertas.ts
export type NivelAlerta = 'VENCIDA' | number; // número = umbral en días (p. ej. 30, 60, 90)
export function diasRestantes(proyeccion: string, hoy: string): number; // días calendario, puede ser negativo
export function calcularNivelAlerta(dias: number, umbrales: number[]): NivelAlerta | null;
// umbrales ordenados ascendente; dias < 0 → 'VENCIDA'; menor umbral u tal que dias <= u; si ninguno → null
export interface Alerta {
  servicioId: string;
  codigo: string;
  clienteId: number;
  clienteNombre: string;
  serie: string;
  proyeccion: string;
  dias: number;
  nivel: NivelAlerta;
}
export function agruparAlertas(
  alertas: Alerta[],
  umbrales: number[]
): { nivel: NivelAlerta; items: Alerta[] }[];
// orden: VENCIDA, luego umbrales ascendentes; items por dias ascendente

// application/alertas/obtenerAlertas.ts
export function obtenerAlertas(
  servicios: Servicio[],
  cfg: ConfigApp,
  hoy: string,
  clienteId?: number
): Alerta[];
// incluye solo estado ∈ {ENTREGADO, FACTURADO} con proyeccionVidaUtil definido
```

### 3.3 Flujos de Power Automate (resumen; el detalle paso a paso está en `docs/06` §3)

| Flujo                | Desencadenador                                                                                                       | Lógica clave                                                                                                                                                                                                                                                                                                                                                                  | Escribe                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Correo OT            | Ítem creado o modificado en `Servicios`, con la condición `Estado = 'En reparación'` **y** `OTCorreoEnviado = false` | Lee `CorreoDestinoOT` de `ConfiguracionApp` → envía el correo → rama de error con aviso al propietario                                                                                                                                                                                                                                                                        | `OTCorreoEnviado = Sí` (solo si el envío fue exitoso) |
| Alertas de vida útil | Recurrencia diaria a las 07:00 (UTC-05:00)                                                                           | Lee `CorreoDestinoAlertas` y `UmbralesAlertaDias` → Get items (Entregado o Facturado, proyección ≤ hoy + máximo umbral, paginación activada) → calcula el nivel con la **misma regla** que `calcularNivelAlerta` → si el nivel es más urgente que `AlertaVidaUtilNivel`, se agrega al resumen; si es menos urgente, se actualiza sin notificar → un único correo si hay filas | `AlertaVidaUtilNivel`                                 |

- **Coherencia app ↔ flujo**: la regla de niveles se documenta en `docs/powerautomate/README.md` con la misma tabla de casos que `alertas.test.ts`. Los umbrales los leen ambos de `ConfiguracionApp`.
- **Propiedad**: los flujos se crean con una cuenta de servicio o con 2 copropietarios (ADR-0013).
- **Ambientes**: primero en DEV (sitio `-DEV`, destinatarios de prueba). PRD se crea importando el paquete y cambiando el sitio y las conexiones (F10).

### 3.4 Decisiones locales

- **Pestañas dinámicas**: las pestañas del `SegmentedControl` se generan a partir de `UmbralesAlertaDias` (por defecto `90,60,30` → Vencidas, ≤ 30, ≤ 60, ≤ 90). Así se cumple ES-008-08 sin cambios de código.
- **Estilo** ← **referencia 06** (`docs/10` §6): `Card fill` con `h2` "Alertas de vida útil", `SegmentedControl` (como "This Week / This Month") y una `BarList` con una fila por equipo. La barra es el **% de vida útil consumida** entre `fechaEntrega` y `proyeccionVidaUtil`: amarilla (`accent`) y roja (`--danger`) si está vencida. El valor a la derecha muestra los días restantes ("12 días", "Vencida hace 3 días") y la fecha. Sin LineChart en v1.0. Si no hay `fechaEntrega`, la barra se omite y solo se muestran los días.
- **Adaptación por breakpoint** (`docs/10` §4.3): compacto = `Card fill` pegada a la BottomNav y filtro de cliente en un `ResponsiveDialog`; medio = `Card` centrada de 720 px con el filtro en línea; expandido = `Card` de 960 px con el filtro junto a los segmentos y la `BarList` en 2 columnas si hay más de 10 filas. En Inicio expandido, `TarjetaAlertas` es el panel "Alertas próximas" (7 col.) junto a la `SummaryCard` (`docs/10` §7.1).
- **Días calendario**: `differenceInCalendarDays(parseISO(proyeccion), parseISO(hoy))`, con `hoy` en `America/Bogota` provisto por el puerto `Clock`.
- **Exclusión de campos de la automatización**: se agrega una prueba explícita al mapper (T005) para que `OTCorreoEnviado` y `AlertaVidaUtilNivel` nunca aparezcan en `aCamposSP` y no participen en el merge (no se mapean a `CamposServicio`).
- **Correo de OT tras corrección**: como `OTCorreoEnviado` queda en Sí, las correcciones no lo reenvían (ES-008-12). Para reenviar, un administrador pone el indicador en No manualmente en SharePoint (documentado en `docs/powerautomate/README.md`).

## 4. Estrategia de pruebas

| Nivel  | Qué                                                                                                                                   | Archivo                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Unit   | `diasRestantes`, `calcularNivelAlerta` (límites: −1, 0, 30, 31, 60, 90, 91; umbrales desordenados y personalizados), `agruparAlertas` | `src/domain/alertas.test.ts`                              |
| Unit   | `obtenerAlertas`: exclusiones por estado y sin proyección, filtro por cliente, configuración inválida → valores por defecto           | `src/application/alertas/obtenerAlertas.test.ts`          |
| Unit   | El mapper nunca emite `OTCorreoEnviado` ni `AlertaVidaUtilNivel`                                                                      | `src/infrastructure/graph/mappers/servicioMapper.test.ts` |
| Comp   | `AlertasPage`: pestañas y contadores, filtro persistente entre pestañas, navegación al detalle                                        | `src/features/alertas/pages/AlertasPage.test.tsx`         |
| Unit   | `porcentajeVidaConsumida(fechaEntrega, proyeccion, hoy)` (0–100, vencida > 100 → 100)                                                 | `src/domain/alertas.test.ts`                              |
| E2E    | Alertas offline con un seed de servicios en varios niveles + axe                                                                      | `tests/e2e/alertas-offline.spec.ts`                       |
| Visual | Alertas (cada pestaña) y el panel de Inicio en 360/768/1280                                                                           | `tests/e2e/visual.spec.ts`                                |
| Manual | Flujos en DEV según `docs/06` §3.3 (OT una sola vez; nivel 30 sin repetición; paso a Vencida; fallo de destinatario)                  | `docs/pruebas/flujos-AAAA-MM-DD.md`                       |

## 5. Riesgos

| Riesgo                                                            | Mitigación                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| La regla de niveles del flujo diverge de la app                   | Una única tabla de casos documentada y probada en ambos lados (T005, T016)          |
| El propietario del flujo deja la empresa → los flujos se detienen | Cuenta de servicio o copropietarios; revisión mensual de ejecuciones (`docs/09` §9) |
| Bucle del flujo de OT al actualizar el ítem                       | Condición del desencadenador sobre `OTCorreoEnviado = false`                        |
| Umbral de 5000 ítems en Get items                                 | Filtro OData por columnas indexadas (`Estado`, `ProyeccionVidaUtil`) + paginación   |

## 6. Seguimiento de complejidad

| Desviación                                    | Por qué                                                                                               | Alternativa simple rechazada                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Lógica fuera del repositorio (Power Automate) | Las alertas temporales y el correo deben ocurrir sin que la app esté abierta y sin backend (ADR-0013) | Correo desde la app con `Mail.Send`: permiso adicional sensible y no resuelve las alertas diarias |
