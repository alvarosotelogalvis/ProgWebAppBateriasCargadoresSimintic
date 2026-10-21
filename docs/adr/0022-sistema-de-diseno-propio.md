# ADR-0022 — Sistema de diseño propio (tokens de las pantallas de referencia) con React Aria Components + CSS Modules, en lugar de Fluent UI

- **Estado**: Aceptado
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (entregó las vistas y el estilo deseados en `screens/`, mobile-first y adaptables por dispositivo); implementación propuesta por Claude
- **Reemplaza a**: [ADR-0019](0019-ui-accesibilidad-i18n.md) (completo) y la parte de **librería de UI** de [ADR-0003](0003-stack-typescript-react-vite-fluent.md) (el resto del stack sigue vigente)
- **Origen en la guía**: `02-App-Web.md` §2 (framework/librería), §3.1, §3.7, §3.8

## Contexto
ADR-0003 y ADR-0019 eligieron Fluent UI v9 (aspecto de Microsoft 365). Después, el usuario entregó **10 pantallas de referencia** (`docs/diseno/referencia/`) con un estilo propio: degradados azul-violeta, tarjetas blancas de radio 20, botón amarillo en MAYÚSCULAS, Montserrat, Material Symbols Rounded, navegación inferior con degradado, accesos en círculos y calendario de rango en amarillo. Fluent UI impone su propio lenguaje visual (Segoe, radios, controles) y reproducir este estilo implicaría sobrescribir casi todo. Además, el usuario pidió que las vistas mobile-first **se adapten** a tablet y escritorio.

Las referencias tienen contrastes que no cumplen WCAG AA (gris secundario, degradado suave, navegación inactiva), lo cual choca con la constitución (Art. VIII).

## Opciones consideradas
1. **Fluent UI v9 con un tema personalizado**. Pros: componentes accesibles listos. Contras: la fidelidad al estilo de la referencia es baja (formas, tipografía y controles de Fluent), hay que pelear contra los estilos base y el CSS-in-JS exige `style-src 'unsafe-inline'`.
2. **MUI / Material UI con tema**. Pros: muy personalizable, con íconos Material. Contras: bundle grande, CSS-in-JS (emotion) y un aspecto Material que también hay que sobrescribir.
3. **Tailwind + shadcn/ui (Radix)**. Pros: liviano y flexible. Contras: traducir `styles.css` a utilidades pierde la correspondencia 1:1 con las clases de referencia; un componente de calendario de rango accesible no viene incluido.
4. **Componentes propios con CSS Modules + tokens + React Aria Components** como base accesible. Pros: fidelidad total a `styles.css` (mismos nombres de componentes), accesibilidad de primer nivel (ComboBox, Select, DatePicker, **RangeCalendar**, Dialog, GridList), CSS estático (CSP sin `unsafe-inline`), bundle acotado. Contras: hay que construir y estilizar cada componente (catálogo de ~30 piezas).

## Decisión
**Opción 4.** Sistema de diseño propio definido en [`docs/10-Sistema-de-Diseno.md`](../10-Sistema-de-Diseno.md):
- Tokens de `styles.css` como variables CSS, con **ajustes mínimos de color y tamaño para WCAG 2.2 AA** y objetivos táctiles de 44 px (tabla de §2 con contrastes medidos).
- Componentes en `src/shared/ui/` con **CSS Modules**. Controles interactivos sobre **`react-aria-components`** (+ `@internationalized/date`, es-CO).
- **Montserrat autoalojada** (`@fontsource/montserrat`) e **íconos Material Symbols Rounded como SVG** (`@material-symbols/svg-500` + `vite-plugin-svgr`). Sin CDN ni Google Fonts (offline + CSP).
- **Mobile-first con 3 breakpoints** (compacto < 600, medio 600–1023, expandido ≥ 1024). Navegación BottomNav → NavRail → Sidebar. Lista y detalle en escritorio. Formularios en 2 columnas. Sheet → Dialog.
- **Solo tema claro** en v1.0 (la referencia no define uno oscuro). Se elimina la opción "Tema" de Ajustes. Se mantiene el **tamaño de fuente** escalable (rem).
- Siguen vigentes de ADR-0019: WCAG 2.2 AA, i18n es-CO con textos externalizados, sin SEO.
- Gráficas sin librería (BarList y DonutProgress propios).

## Consecuencias
- **Positivas**: la UI coincide con el estilo deseado; mejor accesibilidad de los controles complejos; CSP más estricta (posiblemente sin `unsafe-inline`, a validar en S8); sin dependencia del diseño de Microsoft.
- **Negativas**: más trabajo inicial en la spec 001 (catálogo de componentes) y mantenimiento propio del sistema de diseño.
- **Riesgos**: inconsistencia visual entre pantallas → página de catálogo `/tecnico/ui` y capturas de Playwright en 3 viewports.
- **Plan de migración**: no hay código aún. Se actualizan la documentación (SDD §12, §14.2; `docs/04`, `docs/05`) y las specs que mencionaban Fluent (001, 003, 004, 005, 006, 007, 008, 009).

## Cumplimiento / verificación
- Regla de lint o revisión: prohibido importar `@fluentui/*` y prohibidos colores o radios literales en `*.module.css` de las features (solo `var(--…)`). Se puede forzar con `stylelint` (`declaration-property-value-disallowed-list` / `color-no-hex` fuera de `tokens.css`).
- Capturas visuales y axe en 360 / 768 / 1280.

## Referencias
- `docs/10-Sistema-de-Diseno.md` · `docs/diseno/referencia/` · `docs/04-UX-Pantallas-y-Menus.md`
