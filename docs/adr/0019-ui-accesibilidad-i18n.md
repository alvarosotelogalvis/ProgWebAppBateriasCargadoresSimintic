# ADR-0019 — UI mobile-first con Fluent UI v9, accesibilidad WCAG 2.2 AA, i18n es-CO, sin SEO

- **Estado**: Reemplazado por [ADR-0022](0022-sistema-de-diseno-propio.md)
- **Fecha**: 2026-10-21
- **Fecha de cambio de estado**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `02-App-Web.md` §2.1 (i18n y SEO), §3.7, §3.8, §3.9; doc. base §2 (menús: tamaño de fuente, ayuda, versión)

## Contexto

Los usuarios trabajan en campo con celular (una mano, sol, guantes) y en oficina con PC. La guía pide menús de versión, ayuda, configuración y técnico, además del tamaño de fuente.

## Decisión

- **Fluent UI React v9**, tema de marca `#0f6cbd`, claro, oscuro o según el sistema.
- **Mobile-first**: barra inferior en celular, lateral en tablet y PC; objetivos táctiles ≥ 44 px.
- **Tamaño de fuente** configurable (1,0 / 1,15 / 1,3) escalando los tokens tipográficos del tema.
- **Menús** según `docs/04` §4–§5: usuario, ayuda, información (versión y novedades), técnico y configuración inicial.
- **WCAG 2.2 AA**, verificado con axe en E2E y una revisión manual con TalkBack / VoiceOver.
- **i18n**: i18next con un solo idioma `es-CO`, todos los textos externalizados. Formatos con `date-fns` (es) e `Intl` (COP).
- **SEO: no aplica** (app interna). `robots.txt` con `Disallow: /` y `<meta name="robots" content="noindex">`.

## Consecuencias

- **Positivas**: coherencia con M365 y accesibilidad desde el inicio.
- **Negativas**: externalizar los textos agrega algo de esfuerzo en una app de un solo idioma (justificado por mantenibilidad y por la guía).

## Referencias

- `docs/04`
