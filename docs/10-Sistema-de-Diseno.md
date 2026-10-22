# Sistema de diseño — estilo visual, componentes y adaptación por dispositivo

> **Fuente visual**: las pantallas de referencia del usuario en [diseno/referencia/](diseno/referencia/) (`01-login` … `10-pago-qr`, `.png` + `.html` + `styles.css`). Son **mobile-first** (marco de 360 × 740) y su contenido es de ejemplo (una app bancaria): de ellas se toman el **estilo, los tokens y los componentes**, no el contenido. §6 dice qué pantalla de referencia inspira cada pantalla de esta app.
> **Decisión**: [ADR-0022](adr/0022-sistema-de-diseno-propio.md). Este documento manda sobre cualquier mención visual de `04-UX-Pantallas-y-Menus.md`. La UX define _qué_ hay en cada pantalla y este documento, _cómo se ve_ y _cómo se adapta_.
> Los comentarios de los `.html` de referencia hablan de Flutter y de un `DESIGN.md`/`tokens.json` que no se entregaron. Aquí se reemplazan por React y por los tokens de §2.

---

## 1. Principios visuales

1. **Fondo en degradado azul → violeta** con círculos decorativos de línea fina blanca. El contenido vive en **tarjetas blancas** con radio grande y sombra suave.
2. **Acción primaria en amarillo** (`accent`), con texto oscuro, en MAYÚSCULAS y espaciado amplio. Las acciones secundarias van con borde.
3. **Tipografía Montserrat**, títulos en peso 800 en mayúsculas, montos y números protagonistas grandes (peso 700–800).
4. **Íconos Material Symbols Rounded rellenos**, dentro de círculos `primary` en los accesos rápidos.
5. **Navegación principal con degradado** (barra inferior en celular, riel o barra lateral en pantallas grandes).
6. **Mobile-first**: se diseña a 360 px y se **expande** (no se estira) en tablet y escritorio (§4).

---

## 2. Tokens de diseño

Se implementan como variables CSS en `src/shared/ui/tokens.css`. Los valores parten de `diseno/referencia/styles.css`. Los marcados con ⚠️ se **ajustaron para cumplir WCAG 2.2 AA** (constitución, Art. VIII), con el contraste medido junto a cada uno.

### 2.1 Color

| Token                       | Referencia        | **Valor final**                                          | Uso                                                               | Contraste                        |
| --------------------------- | ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| `--gradient-start`          | #167DFE           | ⚠️ **#1F6FE5**                                           | Inicio del degradado principal                                    | Blanco 4.70:1 (antes 3.89)       |
| `--gradient-end`            | #5149FF           | #5149FF                                                  | Fin del degradado principal                                       | Blanco 5.60:1                    |
| `--gradient-soft-start`     | #4F8BFF           | ⚠️ **#2F6BF0**                                           | Degradado suave (Inicio)                                          | Blanco 4.69:1 (antes 3.25)       |
| `--gradient-soft-mid`       | #A3B0FF           | ⚠️ **#5865EC**                                           | Punto medio del suave                                             | Blanco 4.68:1 (antes 2.06)       |
| `--gradient-soft-end`       | #7E7BFF           | ⚠️ **#6A5CF5**                                           | Fin del suave                                                     | Blanco 4.71:1 (antes 3.41)       |
| `--primary`                 | #4A4AF8           | #4A4AF8                                                  | Íconos, enlaces, chips, controles activos                         | Sobre blanco 5.79:1              |
| `--primary-dark`            | #3A3AD6           | #3A3AD6                                                  | Hover y pulsado                                                   | —                                |
| `--primary-light`           | #A0A8F8           | #A0A8F8                                                  | Halo de los accesos rápidos (decorativo)                          | —                                |
| `--accent`                  | #FFC61A           | #FFC61A                                                  | Botón primario, chips destacados, rango del calendario, barras    | Texto `--text-on-accent` 10.42:1 |
| `--accent-dark`             | #E5AE00           | #E5AE00                                                  | Hover y pulsado del botón primario                                | —                                |
| `--surface`                 | #FFFFFF           | #FFFFFF                                                  | Tarjetas                                                          | —                                |
| `--background`              | #EEEFF3           | #EEEFF3                                                  | Fondo neutro (pantallas sin degradado, áreas internas)            | —                                |
| `--border`                  | #D5D8E3           | #D5D8E3 (decorativo) / ⚠️ **#8F94AB** (`--border-input`) | Separadores / **borde de campos** (contraste de componente ≥ 3:1) | 1.42 → 3.00:1                    |
| `--text-title`              | #4B4FD6           | #4B4FD6                                                  | Títulos de tarjeta (`h2`)                                         | 6.20:1                           |
| `--text-primary`            | #2E3150           | #2E3150                                                  | Texto principal                                                   | 12.56:1                          |
| `--text-secondary`          | #8A8FA8           | ⚠️ **#646985**                                           | Etiquetas, ayudas, valores secundarios                            | 5.38:1 (antes 3.19)              |
| `--text-on-primary`         | #FFFFFF           | #FFFFFF                                                  | Texto sobre degradado o `primary`                                 | —                                |
| `--text-on-accent`          | #1E1E2E           | #1E1E2E                                                  | Texto sobre amarillo                                              | —                                |
| `--nav-start` / `--nav-end` | #4050F8 / #5040F8 | igual                                                    | Degradado de la navegación                                        | —                                |
| `--nav-item-inactive`       | blanco 70 %       | ⚠️ **blanco 85 %**                                       | Ítems inactivos de la navegación                                  | 4.53:1 (antes 3.57)              |
| `--danger`                  | #E0394F           | ⚠️ **#C8283E**                                           | Errores, domingos y festivos del calendario, "Vencidas"           | 5.48:1 (antes 4.31)              |
| `--chart-track`             | #DCDDDF           | #DCDDDF                                                  | Pista de barras y donut                                           | —                                |
| `--chart-point`             | #2B2B3A           | #2B2B3A                                                  | Puntos de gráficas                                                | —                                |

**Colores semánticos agregados** (la referencia no los tiene; se necesitan para estados): `--success: #1E7F4F`, `--warning: #9A6700`, `--info: var(--primary)`. Todos ≥ 4.5:1 sobre blanco.

**Colores por estado del servicio** (badge = punto de color + texto; nunca solo color): Borrador `#646985` · Recibido `#4A4AF8` · Diagnosticado `#3A3AD6` · Cotizado `#7A3FD1` · En reparación `#9A6700` · Entregado `#00748A` · Facturado `#1E7F4F` · Disposición final `#7A4A2A` · Anulado `#646985` (tachado).

**Colores por estado de sincronización** (punto + ícono + texto): sincronizado `--success` (check) · pendiente `--warning` (schedule) · error `--danger` (error) · conflicto `#7A3FD1` (sync_problem) · borrador `--text-secondary` (edit).

### 2.2 Forma, sombra y espacio

| Token                                | Valor                                                  | Uso                                               |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------- |
| `--radius-card`                      | 20px                                                   | Tarjeta principal                                 |
| `--radius-card-inner`                | 16px                                                   | Tarjeta interna (teclado, calendario, miniaturas) |
| `--radius-input` / `--radius-button` | 6px                                                    | Campos y botones                                  |
| `--radius-chip`                      | 4px                                                    | Chips (fecha, cuenta, segmentos)                  |
| `--radius-pill`                      | 999px                                                  | Píldoras                                          |
| `--shadow-card`                      | `0 8px 24px rgba(40,40,120,.15)`                       | Tarjetas                                          |
| `--shadow-floating`                  | `0 4px 16px rgba(40,40,120,.12)`                       | Elementos flotantes                               |
| Espaciado                            | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 px (`--space-1…8`) | Márgenes y separaciones                           |
| `--gutter`                           | 16px (celular) · 24px (tablet) · 32px (escritorio)     | Márgenes laterales de pantalla                    |

### 2.3 Tamaños de control

| Token                   | Referencia | **Valor final**                                                 | Motivo                              |
| ----------------------- | ---------- | --------------------------------------------------------------- | ----------------------------------- |
| `--button-height`       | 40px       | ⚠️ **44px**                                                     | Objetivo táctil mínimo (PRD RNF-08) |
| `--button-height-small` | 30px       | ⚠️ **36px visual + área táctil de 44px** (`::before` invisible) | Igual                               |
| `--input-height`        | 40px       | ⚠️ **44px**                                                     | Igual                               |
| `--bottom-nav-height`   | 64px       | 64px + `env(safe-area-inset-bottom)`                            | iPhone con barra de gestos          |
| `--quick-action-icon`   | 56px       | 56px                                                            | —                                   |

### 2.4 Tipografía

Familia **Montserrat** (400, 500, 600, 700, 800), **autoalojada** con `@fontsource/montserrat`. Nunca se carga desde Google Fonts: rompe el modo offline y la CSP.

| Estilo      | Tamaño (rem, base 14 px)        | Peso                              | Uso                                                       |
| ----------- | ------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `display`   | 2.286rem (32)                   | 800                               | Número protagonista grande (p. ej., pendientes en Inicio) |
| `amount-xl` | 2rem (28)                       | 700                               | Montos COP, totales                                       |
| `h1`        | 1.571rem (22)                   | 800, MAYÚSCULAS, tracking .04em   | Nombre de la app, nombre del usuario                      |
| `h2`        | 1.143rem (16)                   | 500, color `text-title`, centrado | Título de tarjeta ("Recepción del equipo")                |
| `body`      | 1rem (14)                       | 400–500                           | Texto general, campos                                     |
| `label`     | 0.857rem (12)                   | 500, `text-secondary`             | Etiquetas de campos                                       |
| `caption`   | ⚠️ 0.857rem (12; referencia 11) | 400                               | Ayudas. Mínimo 12 px por legibilidad                      |
| `nav-label` | ⚠️ 0.857rem (12; referencia 10) | 500 (600 activo)                  | Navegación                                                |
| `button`    | 0.929rem (13)                   | 700, MAYÚSCULAS, tracking .12em   | Botones                                                   |

- **Todos los tamaños en `rem`**. El ajuste de _Tamaño de fuente_ (Normal 1.0 / Grande 1.15 / Muy grande 1.3) cambia `html { font-size: calc(87.5% * var(--escala-fuente)) }`.
- Los números en tablas y montos usan `font-variant-numeric: tabular-nums`.

### 2.5 Iconografía

- **Material Symbols Rounded**, relleno (`FILL 1`, peso 500), como **SVG importados por ícono** (`@material-symbols/svg-500` + `vite-plugin-svgr`). Se incluyen en el bundle solo los usados. Sin fuente de íconos ni CDN.
- Tamaños: 20 (en campos), 24 (navegación), 28 (dentro de los círculos de acceso rápido), 72 (avatar).
- Íconos sugeridos: `add_circle` (nuevo), `inventory_2` (servicios), `sync` (sincronizar), `notifications` (alertas), `battery_charging_full` (batería), `power` (cargador), `photo_camera`, `image`, `upload_file`, `picture_as_pdf`, `calendar_month`, `swap_horiz`, `arrow_forward`, `person`, `help`, `build` (técnico), `settings`, `cloud_done`, `cloud_off`, `schedule`, `error`, `sync_problem`, `check_circle`, `delete`, `edit`, `receipt_long` (factura), `request_quote` (cotización), `engineering` (OT), `local_shipping` (entrega), `recycling` (disposición final), `block` (anulado).

### 2.6 Fondos decorativos

- `GradientBackground` (variantes `principal` y `suave`) con 2–3 `DecoCircle`: círculos de borde blanco de 1.5 px y 15 % de opacidad, `aria-hidden`, `pointer-events: none`. Posiciones fijas por breakpoint (§4.4).
- `prefers-reduced-motion`: sin animaciones de entrada.
- **Solo tema claro en v1.0**: la referencia no define un tema oscuro. El tema oscuro queda en el backlog.

---

## 3. Catálogo de componentes

Cada clase de `styles.css` se convierte en un componente React reutilizable en `src/shared/ui/` (CSS Modules + tokens). Los controles interactivos complejos usan **React Aria Components** como base accesible (teclado, foco, ARIA, lectores de pantalla) y se estilizan con los tokens.

| Componente React                                                           | Clase de referencia                       | Pantalla de referencia | Base accesible                                     | Notas                                                                                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------- | ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`                                                                 | `.screen`, `.screen-body`                 | todas                  | —                                                  | Fondo + navegación + contenido. Responsive §4                                                                                                                       |
| `GradientBackground`, `DecoCircle`                                         | `.screen`, `.soft`, `.deco-circle`        | todas                  | —                                                  | `aria-hidden`                                                                                                                                                       |
| `Card` (variantes `fill`, `pegada-abajo`)                                  | `.card`, `.card.fill`                     | 03, 06–10              | —                                                  | `pegada-abajo` = sin radio inferior, unida a la BottomNav                                                                                                           |
| `CardInner`                                                                | `.card-inner`                             | 02, 08, 09, 10         | —                                                  | —                                                                                                                                                                   |
| `PrimaryButton` (`size: normal \| small`)                                  | `.primary-button`                         | 01–05, 08              | RAC `Button`                                       | Amarillo, MAYÚSCULAS. Estados: hover `accent-dark`, foco con anillo `primary` de 2 px y desplazamiento de 2 px, deshabilitado al 40 % de opacidad + `aria-disabled` |
| `SecondaryButton` (`onGradient`)                                           | `.secondary-button`                       | 02, 03                 | RAC `Button`                                       | Con borde                                                                                                                                                           |
| `TextLink` (`onGradient`)                                                  | `.text-link`                              | 01, 03, 10             | RAC `Link`                                         | Subrayado                                                                                                                                                           |
| `TextField`, `TextAreaField`                                               | `.text-field` + `.label` + `.helper-text` | 03, 05, 08, 10         | RAC `TextField`                                    | Etiqueta siempre visible arriba. Error en `--danger` con ícono, vinculado por `aria-describedby`                                                                    |
| `SelectField`                                                              | `.text-field` + `expand_more`             | 08                     | RAC `Select`                                       | Estado, tipo de equipo, diagnóstico, estado de la cotización                                                                                                        |
| `ComboboxField`                                                            | `.text-field`                             | 08                     | RAC `ComboBox`                                     | Cliente (sin texto libre), marca (con texto libre)                                                                                                                  |
| `PillButton`                                                               | `.pill-input`                             | 01, 02, 09             | RAC `Button`                                       | "Iniciar sesión con Microsoft", "Confirmar como …"                                                                                                                  |
| `PillInput` (`outlined`)                                                   | `.pill-input.outlined`                    | 09                     | RAC `SearchField`                                  | Buscador de servicios                                                                                                                                               |
| `AmountInput`                                                              | `.amount-input` + `.currency`             | 10                     | RAC `NumberField`                                  | Moneda **COP** fija a la izquierda y monto grande a la derecha con formato es-CO                                                                                    |
| `DateChip`                                                                 | `.date-chip`                              | 08                     | RAC `DatePicker` (disparador)                      | Chip `primary` con la fecha formateada ("lun, 15 sep 2026")                                                                                                         |
| `Calendar`, `RangeCalendar`                                                | `.calendar`                               | 08                     | RAC `Calendar` / `RangeCalendar`                   | Encabezado `primary` con año y mes. Rango en píldora `accent`. Domingos y festivos en `--danger`. Semana desde el lunes (es-CO)                                     |
| `DateRangeFilter`                                                          | DateChip × 2 + `swap_horiz` + Calendar    | 08                     | —                                                  | Filtro "desde – hasta" de la fecha de recepción                                                                                                                     |
| `Checkbox`                                                                 | `.checkbox-row`                           | 03, 05                 | RAC `Checkbox`                                     | —                                                                                                                                                                   |
| `SegmentedControl`                                                         | `.segmented`                              | 06, 07                 | RAC `ToggleButtonGroup` (selección única) o `Tabs` | Pestañas de alertas, filtros rápidos                                                                                                                                |
| `ResponsiveNav` = `BottomNav` / `NavRail` / `Sidebar`                      | `.bottom-nav`, `.nav-item`                | 04–10                  | `nav` + enlaces de React Router                    | Una sola definición de ítems y tres presentaciones (§4.2)                                                                                                           |
| `QuickActionGrid`, `QuickAction`                                           | `.quick-action-grid`                      | 04                     | RAC `Link`                                         | Círculo `primary` con halo `primary-light`, ícono blanco, etiqueta y badge numérico opcional                                                                        |
| `SummaryCard`                                                              | `.balance-card`                           | 04                     | —                                                  | Avatar + nombre + etiqueta + número grande + 2 botones small                                                                                                        |
| `Avatar`                                                                   | `.avatar`, `.user-avatar`                 | 02, 04                 | —                                                  | Iniciales o ícono `person`                                                                                                                                          |
| `ListRow` / `ServiceList`                                                  | `.transaction-list`                       | 07                     | RAC `GridList`                                     | Punto de color (estado), título (código), subtítulo (cliente · marca), valor a la derecha (fecha o badge de sync)                                                   |
| `BarList`                                                                  | `.bar-list`                               | 06                     | —                                                  | Barras de progreso: vida útil consumida (alertas) o progreso de subida (sync). `role="meter"` o `progressbar` con su valor                                          |
| `DonutProgress`                                                            | SVG de 07                                 | 07                     | —                                                  | Porcentaje grande en el centro. `role="img"` + `aria-label`                                                                                                         |
| `Pagination`                                                               | `.pagination`                             | 07                     | —                                                  | **Opcional, sin uso en v1.0** (las listas se virtualizan). Se conserva en el catálogo por si se necesita                                                            |
| `TablaResponsive`                                                          | —                                         | —                      | RAC `Table`                                        | Tarjetas apiladas en compacto/medio y tabla real en expandido (conflictos, logs, estado técnico)                                                                    |
| `RadioGroupField`                                                          | —                                         | —                      | RAC `RadioGroup`                                   | Elegir "Mi valor" o "SharePoint" en Resolver conflicto                                                                                                              |
| `Chip` (`account`, `tag`)                                                  | `.account-chip`, `.tag`                   | 05, 09                 | —                                                  | Chips amarillos con texto oscuro                                                                                                                                    |
| `PhotoCarousel`                                                            | `.bank-card-carousel`                     | 05                     | RAC `GridList` horizontal                          | Fotos del servicio en el detalle, con flechas `accent`                                                                                                              |
| `PhotoGallery`, `PhotoTile`                                                | `.card-inner`                             | 10 (QrCard)            | —                                                  | Miniatura en `CardInner` con badge de sync                                                                                                                          |
| `ResponsiveDialog` (= `Sheet` en compacto / `Dialog` en medio y expandido) | —                                         | —                      | RAC `Modal` + `Dialog`                             | Un solo componente que elige la presentación con `useBreakpoint()`: hoja inferior en celular, modal centrado en pantallas grandes                                   |
| `Banner`                                                                   | —                                         | —                      | `role="status"`/`alert`                            | Avisos de almacenamiento, versión, pendientes o error, sobre una tarjeta blanca con borde izquierdo de color                                                        |
| `Toast`                                                                    | —                                         | —                      | región `aria-live="polite"`                        | Confirmaciones breves                                                                                                                                               |
| `StatusBadge`, `SyncBadge`                                                 | —                                         | —                      | —                                                  | Punto + texto (+ ícono)                                                                                                                                             |
| `EmptyState`, `Skeleton`                                                   | —                                         | —                      | —                                                  | Estados vacío y de carga                                                                                                                                            |

**Reglas de componentes**

- Ningún componente de una feature define colores, radios ni sombras propios: solo usa tokens.
- Toda variante nueva se agrega en `src/shared/ui/` con su prueba de componente y su caso en la página de catálogo `/tecnico/ui` (solo en DEV).
- El estado de foco visible es obligatorio en todo control (anillo de 2 px `primary`, o blanco sobre el degradado).

---

## 4. Adaptación por dispositivo (mobile-first)

### 4.1 Breakpoints

| Nombre      | Ancho       | Dispositivos típicos                                                                |
| ----------- | ----------- | ----------------------------------------------------------------------------------- |
| `compacto`  | < 600 px    | Celulares (base del diseño, 360–430 px)                                             |
| `medio`     | 600–1023 px | Tablets en vertical, celulares grandes en horizontal, ventanas angostas de PC       |
| `expandido` | ≥ 1024 px   | Tablets en horizontal, laptops, escritorio                                          |
| `amplio`    | ≥ 1440 px   | Monitores grandes (el contenido se limita a un ancho máximo de 1280 px y se centra) |

Se implementan con media queries en CSS (`@media (min-width: 600px)`, …) y con un hook `useBreakpoint()` solo donde cambia la **estructura** (p. ej., una hoja inferior frente a un modal).

### 4.2 Navegación

|                                    | compacto                                                                    | medio                                                                                                                              | expandido                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patrón                             | **BottomNav** (referencia), 4 ítems: Inicio · Servicios · Sincronizar · Más | **NavRail** vertical a la izquierda, de 80 px, con el mismo degradado (`nav-start → nav-end` en vertical), ícono + etiqueta debajo | **Sidebar** de 240 px con el degradado, logo y nombre arriba, ícono + etiqueta en línea y los ítems de "Más" expandidos (Alertas, Ayuda, Técnico, Ajustes) |
| Botón "+ Nuevo"                    | FAB amarillo encima de la BottomNav (abajo a la derecha)                    | FAB en la parte superior del riel                                                                                                  | Botón primario en la parte superior de la sidebar                                                                                                          |
| Indicador de conexión y pendientes | Barra superior compacta sobre el degradado                                  | Igual, en la parte superior del contenido                                                                                          | En la barra superior del área de contenido, junto a la cuenta del usuario                                                                                  |

### 4.3 Contenido y tarjetas

|                           | compacto                                                                           | medio                                                                     | expandido                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Márgenes laterales        | 16px                                                                               | 24px                                                                      | 32px                                                                                                                                    |
| Tarjetas de formulario    | `Card fill` a todo el ancho, pegada a la BottomNav (como en la referencia 03 y 08) | `Card` centrada, máx. 720px, con radio completo (no pegada)               | `Card` máx. 960px. Los campos van en **2 columnas** (grid de 12: cada campo ocupa 6; los textos largos, 12)                             |
| Inicio                    | SummaryCard + QuickActionGrid de **3 columnas** (referencia 04)                    | SummaryCard + grid de **4 columnas**                                      | Grid de 12: SummaryCard (5 col.) + panel "Alertas próximas" (7 col.). QuickActionGrid de **6 columnas** debajo y panel "Mis pendientes" |
| Servicios (lista)         | Lista a pantalla completa. Al tocar → detalle en una pantalla nueva                | Lista en tarjetas de 2 columnas. Al tocar → detalle en una pantalla nueva | **Lista y detalle**: lista de 5 col. y detalle de 7 col. en la misma vista. La URL `/servicios/:id` mantiene la lista visible           |
| Filtros                   | Botón "Filtros" → **Sheet** inferior con la tarjeta de la referencia 08            | Sheet lateral derecha                                                     | Panel de filtros visible arriba de la lista (en línea) y el calendario de rango en un popover                                           |
| Formulario de etapa       | Pantalla completa (Card fill). Botón primario fijo abajo, encima de la BottomNav   | Card centrada. Botón al final de la tarjeta                               | Dentro del panel de detalle (o en un modal amplio si se abre desde la lista)                                                            |
| Diálogos                  | **Sheet** inferior con asa                                                         | Modal centrado de máx. 560px                                              | Modal centrado de máx. 560px                                                                                                            |
| Galería de fotos          | 3 por fila                                                                         | 4 por fila                                                                | 6 por fila. Visor en un modal con flechas                                                                                               |
| Tablas (logs, conflictos) | Tarjetas apiladas                                                                  | Tarjetas apiladas                                                         | Tabla real con encabezados                                                                                                              |

### 4.4 Fondo

- **compacto**: degradado a pantalla completa con círculos decorativos (como la referencia).
- **medio / expandido**: el degradado ocupa todo el fondo y las tarjetas flotan encima. Los círculos decorativos se escalan (×1.5) y se ubican en las esquinas para no competir con el contenido. En `amplio`, el contenido se centra a 1280 px.

### 4.5 Orientación y entrada

- En horizontal en un celular (alto < 500px), la BottomNav se mantiene, pero la SummaryCard de Inicio y el QuickActionGrid se ponen **lado a lado**.
- Con puntero fino (`pointer: fine`) se muestran estados _hover_ y la opción "Webcam". Con puntero táctil se priorizan áreas de 44 px y "Tomar foto".
- Teclado en escritorio: atajos opcionales (`N` = nuevo, `/` = buscar), declarados en la Ayuda.
- Áreas seguras: `env(safe-area-inset-*)` en la barra superior, la BottomNav y el FAB (iPhone con notch o isla).

---

## 5. Implementación técnica (resumen)

- **CSS Modules** (`*.module.css`) + `tokens.css` global. Sin CSS-in-JS. Esto permite una CSP sin `style-src 'unsafe-inline'` (a validar en el spike S8).
- **React Aria Components** (`react-aria-components`) como base de los controles complejos (ComboBox, Select, DatePicker, Calendar, RangeCalendar, Dialog/Modal, GridList, ToggleButtonGroup, Tabs, NumberField). Fechas con `@internationalized/date`, locale `es-CO`.
- **Fuentes**: `@fontsource/montserrat` (400, 500, 600, 700, 800; subconjunto latin), importadas en `main.tsx`. Precacheadas por el service worker.
- **Íconos**: `@material-symbols/svg-500` (variante _rounded_, _fill_; la ruta exacta de los archivos dentro del paquete se confirma al instalarlo, en la spec 001) + `vite-plugin-svgr`, con un componente `Icon` que fija el tamaño, `aria-hidden` y el color `currentColor`.
- **Gráficas**: sin librería. `BarList` y `DonutProgress` son componentes SVG o CSS propios (alcance acotado a v1.0).
- **Página de catálogo** `/tecnico/ui` (solo con `VITE_APP_ENV=dev`) que muestra todos los componentes y estados, para revisión visual y pruebas de regresión con capturas de Playwright.

---

## 6. Correspondencia: pantalla de referencia → pantalla de la app

| Referencia                         | Qué se toma                                                                                                | Pantalla de esta app (UX)                                                                          | Adaptación                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **01 Login**                       | Logo en un círculo blanco, nombre en `h1`, subtítulo con tracking, píldora + botón amarillo, enlaces abajo | **Bienvenida / Configuración inicial (paso Iniciar sesión)** y **Instalar**                        | Logo "ST" (ServicioTec), "SERVICIO TÉCNICO / BATERÍAS Y CARGADORES". En lugar del campo de contraseña: `PillButton` "Iniciar sesión con Microsoft" (la contraseña se escribe en la página de Microsoft). Enlaces: "¿Cómo instalar?", "Ayuda"                                        |
| **02 Login con PIN**               | Avatar, nombre en `h1`, píldora, botones primario y secundario sobre el degradado                          | **Confirmar identidad para sincronizar** (parte superior) y **Mi cuenta**                          | **Sin teclado PIN** (la identidad la da Entra ID, ADR-0006). Avatar + nombre + correo + "CONFIRMAR Y SINCRONIZAR" + "USAR OTRA CUENTA" (secundario on-gradient)                                                                                                                     |
| **03 Registro**                    | Card casi a pantalla completa, campos apilados, checkbox, botones primario y secundario                    | **Formularios de etapa** (Recepción, Diagnóstico, Cotización, OT, Entrega, Facturación, Anulación) | Card fill con `h2` ("Recepción del equipo"), campos con etiqueta, galería de fotos, "COMPLETAR RECEPCIÓN" (primario) + "GUARDAR BORRADOR"/"CANCELAR" (secundario)                                                                                                                   |
| **04 Dashboard**                   | Fondo suave, SummaryCard, QuickActionGrid de 3 × 3, BottomNav                                              | **Inicio**                                                                                         | SummaryCard: avatar + "Hola, Ana" + etiqueta "PENDIENTES POR SINCRONIZAR" + número `display` + "SINCRONIZAR" y "+ NUEVO". Accesos (con badge numérico): Nuevo servicio · Servicios · Sincronizar · Recibidos · En reparación · Por facturar · Alertas · Ayuda · Técnico (según rol) |
| **05 Vincular tarjeta**            | Carrusel con flechas amarillas, Card pegada a la BottomNav                                                 | **Detalle del servicio** (cabecera)                                                                | `PhotoCarousel` con las fotos de ingreso y salida arriba, debajo la Card con los datos y la línea de tiempo                                                                                                                                                                         |
| **06 Ingresos y gastos (gráfica)** | SegmentedControl, BarList con barra amarilla/azul y valores a la derecha                                   | **Alertas de vida útil**                                                                           | Segmentos: Vencidas · ≤30 · ≤60 · ≤90 (desde la config). BarList: una fila por equipo, barra = % de vida útil consumida (amarilla, roja si está vencida), valor = días restantes y fecha. Sin LineChart en v1.0                                                                     |
| **07 Ingresos y gastos (%)**       | DonutProgress, SegmentedControl, lista con puntos de color, paginación                                     | **Sincronización** (resumen y cola)                                                                | Donut = % de registros sincronizados (o el progreso de la ejecución en curso). Segmentos: En cola · Con error · Conflictos. ListRow por registro con un punto del color de su estado de sync                                                                                        |
| **08 Historial (filtros)**         | Card con campos, Select, DateChips + swap, Calendar de rango, botón                                        | **Filtros de Servicios** (Sheet en celular) y **campos de fecha** de los formularios               | Campos: buscar texto, Estado (Select), Cliente (Combobox), Tipo; rango de fecha de recepción con DateChips + RangeCalendar; "APLICAR" + "LIMPIAR". El Calendar se reutiliza como selector de fecha en las etapas                                                                    |
| **09 Transferencia**               | Título, número grande, chips "desde → hasta", píldora outlined                                             | **Confirmar sincronización**                                                                       | "Sincronizar" + `amount-xl` "3 registros · 11 archivos" + chips amarillos "ESTE DISPOSITIVO" → "SHAREPOINT" + `PillButton` outlined "Confirmar como ana@empresa.com". En lugar del teclado PIN: la lista de lo que se subirá y, durante el sync, el progreso (BarList)              |
| **10 Pago QR**                     | AmountInput (moneda + monto), campo con etiqueta, tarjeta interna centrada, enlace                         | **Cotización** y **Orden de trabajo** (valores COP) y la vista previa de un **PDF adjunto**        | AmountInput con "COP" para `cotizacionValor` y `otCostoReparacion`. CardInner centrada para la vista previa del PDF o la miniatura. TextLink "Abrir en SharePoint". (El QR queda para el backlog: lector de serie)                                                                  |

Pantallas sin referencia directa (Más, Ajustes, Ayuda, Acerca de, Técnico, Resolver conflicto) usan el mismo lenguaje: Card fill sobre el degradado, `h2` centrado, filas tipo ListRow con ícono `primary` y chevron.

---

## 7. Wireframes adaptativos (ejemplos clave)

### 7.1 Inicio

```
COMPACTO (360)                     MEDIO (768)                              EXPANDIDO (1280)
┌──────────────────┐   ┌───────────────────────────────┐   ┌──────────┬────────────────────────────────────────┐
│ ● En línea   ⟳3  │   │R│ ● En línea           ⟳3     │   │ ST       │ ● En línea            ⟳3   Ana Pérez ▾ │
│┌────────────────┐│   │A│┌─────────────────────────┐  │   │ SERVICIO │┌──────────────────┐┌──────────────────┐ │
││(👤) HOLA, ANA  ││   │I││(👤) HOLA, ANA            │  │   │ TÉCNICO  ││(👤) HOLA, ANA     ││ ALERTAS PRÓXIMAS │ │
││PENDIENTES      ││   │L││PENDIENTES  3            │  │   │[+ NUEVO] ││PENDIENTES  3      ││ ▓▓▓▓░ CAR-1  12d │ │
││ 3              ││   │ ││[SINCRONIZAR] [+ NUEVO]  │  │   │ Inicio   ││[SINCRONIZAR][NUEVO││ ▓▓▓░░ BAT-7  28d │ │
││[SINCR.][+NUEVO]││   │ │└─────────────────────────┘  │   │ Servicios│└──────────────────┘└──────────────────┘ │
│└────────────────┘│   │ │ (◉)  (◉)  (◉)  (◉)          │   │ Sincron. │ (◉) (◉) (◉) (◉) (◉) (◉)                 │
│ (◉)  (◉)  (◉)    │   │ │ (◉)  (◉)  (◉)  (◉)          │   │ Alertas  │ ┌ MIS PENDIENTES ───────────────────┐  │
│ (◉)  (◉)  (◉)    │   │ │ (◉)                         │   │ Ayuda    │ │● CAR-1-NV4520  NAVAR…   ⟳ pend.   │  │
│ (◉)  (◉)  (◉)    │   │ │                              │   │ Técnico  │ └───────────────────────────────────┘  │
├──────────────────┤   └───────────────────────────────┘   └──────────┴────────────────────────────────────────┘
│ 🏠  📋  ⟳  ☰     │    (riel con degradado a la izq.)       (sidebar con degradado)
└──────────────────┘
```

### 7.2 Servicios: lista y detalle

```
COMPACTO: lista → (toque) → detalle (pantalla nueva, con ‹ atrás)
EXPANDIDO:
┌──────────┬───────────────────────┬──────────────────────────────────────┐
│ Sidebar  │ [🔍 Buscar…] [Filtros] │ CAR-1-NV4520          [En reparación]│
│          │ ● CAR-1-NV4520   ✓    │ ‹ [foto][foto][foto] ›   (carrusel)   │
│          │ ● BAT-7-X99      ⟳    │ ● Recepción ✓  ● Diagnóstico ✓       │
│          │ ● BAT-8-Y10      ⚠    │ ◉ Orden de trabajo  [CONTINUAR]      │
│          │ …(virtualizada)       │ ○ Entrega  ○ Facturación             │
└──────────┴───────────────────────┴──────────────────────────────────────┘
```

### 7.3 Formulario de recepción

```
COMPACTO (Card fill, como la ref. 03)        EXPANDIDO (Card de 960, 2 columnas)
┌──────────────────────┐                     ┌──────────────────────────────────────────────┐
│  Recepción del equipo│                     │            Recepción del equipo              │
│ Tipo de equipo       │                     │ Tipo de equipo        │ Fecha de recepción   │
│ [Batería        ▾]   │                     │ [Batería        ▾]    │ [lun, 15 sep 2026 📅]│
│ Fecha de recepción   │                     │ Cliente               │ N.º de solicitud     │
│ [lun, 15 sep 2026]   │                     │ [ARIS MINING…   ▾]    │ [1               ]   │
│ Cliente              │                     │ Marca                 │ Referencia           │
│ [ARIS MINING…   ▾]   │                     │ [ROQUET         ▾]    │ [48VDC450A       ]   │
│ …                    │                     │ Serie                 │                      │
│ Fotos de ingreso 2/10│                     │ [NV4520          ]    │                      │
│ [img][img][ + ]      │                     │ Fotos de ingreso (2 de 1–5)                  │
│ [📷 FOTO][🖼 GALERÍA]│                     │ [img][img][ + ]   [📁 ARCHIVO] [🎥 WEBCAM]    │
│ Guardado ✓ 10:42     │                     │ Guardado ✓ 10:42      [CANCELAR] [COMPLETAR] │
│ [ COMPLETAR RECEPC. ]│                     └──────────────────────────────────────────────┘
├──────────────────────┤
│ 🏠  📋  ⟳  ☰         │
└──────────────────────┘
```

---

## 8. Accesibilidad aplicada al estilo

- Los ajustes de color de §2.1 garantizan ≥ 4.5:1 para texto normal y ≥ 3:1 para componentes y bordes de campos.
- Los textos blancos pequeños (etiquetas de accesos rápidos, navegación) **siempre** van sobre el degradado ajustado, nunca sobre zonas claras.
- El amarillo `accent` nunca se usa para texto sobre blanco (contraste insuficiente). Solo como fondo, con `--text-on-accent`.
- Los estados de color (servicio, sync, alertas) siempre van acompañados de texto o ícono.
- El foco es visible en todos los controles, con el anillo adaptado al fondo (blanco sobre el degradado, `primary` sobre blanco).
- Las MAYÚSCULAS se aplican con `text-transform` (el texto fuente queda en tipo oración, para que el lector de pantalla no deletree).

## 9. Verificación visual

- Capturas de Playwright de las pantallas clave en 3 viewports (360×740, 768×1024, 1280×800) en `tests/e2e/visual.spec.ts`, comparadas contra una línea base aprobada.
- Revisión manual contra `diseno/referencia/*.png` en celular: degradado, tarjetas, botones, tipografía y navegación coinciden en estilo.
- axe sin violaciones `serious`/`critical` en los tres viewports.
