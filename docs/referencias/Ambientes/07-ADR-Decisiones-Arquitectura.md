# Registro de Decisiones de Arquitectura (ADR) — aplica a TODO tipo de aplicación

> Derivado de `../MejoresPracticasDesarrolloSoftwareYApis.md`, secciones 2, 6.4 y 24.4. **[Generado por Claude]**. Este archivo es **obligatorio** para cualquier proyecto (web, API, escritorio, móvil o nube), igual que `01-Comun-Transversal.md`. Cada archivo de ambiente (`02` a `06`) lista, en su sección "Registro de decisiones (ADR)", los ADR mínimos que ese tipo de app debe tener.

## 0. Cómo usarlo un agente de IA
1. Al iniciar trabajo en un proyecto, **busca `docs/adr/`**. Si no existe, créalo con el índice (`README.md`) y el `ADR-0001` (ver sección 6) antes de tomar cualquier decisión de diseño.
2. Lee el índice de ADR **antes** de preguntar una decisión 🔶: si ya existe un ADR `Aceptado` que la responde, respétalo y no vuelvas a preguntar.
3. Cada vez que el usuario responda una decisión 🔶 (o se tome cualquier decisión de arquitectura/diseño relevante), **crea el ADR correspondiente en la misma sesión** — no lo dejes para después.
4. Si una decisión nueva contradice un ADR vigente, **no edites el ADR viejo**: crea uno nuevo que lo reemplace (ver sección 4) y actualiza el índice.
5. Refleja un resumen de las decisiones vigentes en `CLAUDE.md`/`README.md` con enlace al ADR (el ADR es la fuente de verdad; `CLAUDE.md` es el resumen rápido).

---

## 1. Qué es un ADR
Un **Architecture Decision Record** es un documento corto (1–2 páginas) que registra **una sola** decisión de arquitectura o diseño: el contexto que la motivó, las opciones evaluadas, la decisión tomada y sus consecuencias. El conjunto de ADR forma el historial de *por qué* el sistema es como es.

## 2. Cuándo crear un ADR
Crear un ADR cuando la decisión:
- Responde un punto marcado 🔶 en cualquiera de los archivos de esta carpeta (stack, arquitectura, login, actualización, branching, etc.).
- Es **costosa de revertir** (base de datos, framework, proveedor cloud, estilo de API, modelo de multi-tenancy).
- Afecta atributos de calidad (seguridad, rendimiento, disponibilidad, mantenibilidad — doc. base, sección 23).
- Introduce o elimina una dependencia externa importante (servicio de terceros, pasarela de pagos, librería central).
- Define un estándar o convención que todo el equipo/agente debe seguir (estructura de carpetas, manejo de errores, versionado).
- Acepta conscientemente una **deuda técnica** o una excepción a estas buenas prácticas.

**No** requiere ADR: detalles de implementación locales y fácilmente reversibles (nombre de una variable, orden de un método, estilo de un componente puntual).

## 3. Ubicación, nombre y formato
- Carpeta: `docs/adr/` en la raíz del repositorio (versionada junto con el código).
- Nombre de archivo: `NNNN-titulo-en-kebab-case.md` con numeración secuencial de 4 dígitos que **nunca se reutiliza** (ej. `0003-usar-postgresql-como-base-de-datos.md`).
- Índice: `docs/adr/README.md` con la tabla de todos los ADR y su estado (plantilla en [Plantillas/ADR-README-indice.md](Plantillas/ADR-README-indice.md)).
- Formato: Markdown con la plantilla de [Plantillas/ADR-0000-plantilla.md](Plantillas/ADR-0000-plantilla.md) (basada en el formato de Michael Nygard / MADR).
- Idioma: el mismo de la documentación del proyecto.

## 4. Ciclo de vida y actualización con los cambios de decisión

| Estado | Significado |
|---|---|
| `Propuesto` | En discusión; aún no se implementa. |
| `Aceptado` | Vigente; el código debe seguirlo. |
| `Rechazado` | Se evaluó y se descartó (se conserva para no volver a discutirlo). |
| `Obsoleto` | Ya no aplica (ej. se retiró el componente), sin un reemplazo directo. |
| `Reemplazado por ADR-NNNN` | Una decisión posterior lo sustituyó. |

Reglas:
- **Un ADR `Aceptado` es inmutable** en su contenido de decisión. Solo se permite corregir errores tipográficos, agregar enlaces o cambiar su **estado**.
- **Cuando una decisión cambia**:
  1. Crear un ADR nuevo con el siguiente número, con `Reemplaza a: ADR-NNNN` y un contexto que explique **qué cambió** (nuevos requerimientos, problemas encontrados, costos, etc.).
  2. En el ADR anterior, cambiar solo el estado a `Reemplazado por ADR-MMMM` y la fecha del cambio de estado.
  3. Actualizar el índice `docs/adr/README.md` y el resumen en `CLAUDE.md`/`README.md`.
  4. Si el cambio implica migración de código/datos, registrar el plan en la sección "Consecuencias" del ADR nuevo.
- Una decisión que se **amplía** (no se contradice) puede registrarse como ADR nuevo con `Relacionado con: ADR-NNNN`.
- El PR que implementa una decisión debe **incluir o referenciar su ADR**; el PR que la cambia debe incluir el ADR que la reemplaza.
- Revisar el índice de ADR en cada retrospectiva/fin de release: ¿alguna decisión quedó obsoleta o se está incumpliendo en el código?

## 5. Contenido mínimo de un ADR
1. **Título** — la decisión en forma de frase corta ("Usar JWT con refresh tokens para autenticación").
2. **Estado** y **fecha**.
3. **Decisores** — quién tomó la decisión (usuario, equipo, agente de IA con aprobación de ...).
4. **Contexto** — el problema, las restricciones y las fuerzas en juego.
5. **Opciones consideradas** — al menos 2, con pros y contras.
6. **Decisión** — qué se eligió y por qué.
7. **Consecuencias** — positivas, negativas, riesgos y deuda técnica aceptada.
8. **Referencias** — sección de esta guía que originó la decisión (ej. "`02-App-Web.md` §2"), tickets, enlaces.

## 6. ADR inicial obligatorio (ADR-0001)
Todo proyecto arranca con:

> **ADR-0001 — Registrar las decisiones de arquitectura mediante ADR**
> Estado: Aceptado. Decisión: usar ADR en `docs/adr/` con la plantilla de esta guía, numeración secuencial, y reemplazo (nunca edición) cuando una decisión cambie.

Luego se crean los ADR mínimos transversales (sección 7) y los del ambiente correspondiente (sección "Registro de decisiones (ADR)" de `02` a `06`).

## 7. ADR mínimos transversales (todo proyecto)
Corresponden a las decisiones 🔶 de `01-Comun-Transversal.md`:

| # sugerido | Decisión | Origen |
|---|---|---|
| ADR-0001 | Uso de ADR para registrar decisiones | Esta guía |
| ADR-0002 | Lenguaje, framework y stack principal | `01` §1 / doc. base §1 |
| ADR-0003 | Patrón de arquitectura (monolito, modular, microservicios, hexagonal, clean, MVC…) | `01` §1 / doc. base §6.2 |
| ADR-0004 | Mecanismo de login y gestión de sesiones | `01` §3.0 / doc. base §7.1 |
| ADR-0005 | Motor y estrategia de base de datos (y caché, si aplica) | `01` §4 / doc. base §9 |
| ADR-0006 | Estrategia de branching y manejo de fixes (si el desarrollo es colaborativo) | `01` §7.1 / doc. base §25 |
| ADR-0007 | Mecanismo de actualización/distribución de la app | `01` §11.1 / doc. base §19.1 |
| ADR-0008 | Metodología de desarrollo (SDLC) | `01` §14 / doc. base §24 |

> La numeración es sugerida: lo importante es que cada decisión tenga su ADR, no el número exacto. Si una decisión no aplica al proyecto, se puede omitir o registrar como `Rechazado`/"No aplica" con su justificación.

## 8. Checklist ADR
- [ ] Existe `docs/adr/` con `README.md` (índice) y `ADR-0001`.
- [ ] Cada decisión 🔶 respondida tiene su ADR `Aceptado`.
- [ ] Los ADR mínimos del ambiente (`02`–`06`) están creados o marcados como "No aplica".
- [ ] Ningún ADR `Aceptado` fue editado en su decisión; los cambios se hicieron con ADR de reemplazo.
- [ ] Los ADR reemplazados apuntan al ADR que los sustituye y viceversa.
- [ ] El índice y el resumen en `CLAUDE.md`/`README.md` están sincronizados con los estados reales.
- [ ] El código en producción es coherente con los ADR vigentes.

## 9. Ver también
- Plantillas: [Plantillas/ADR-0000-plantilla.md](Plantillas/ADR-0000-plantilla.md), [Plantillas/ADR-README-indice.md](Plantillas/ADR-README-indice.md)
- `01-Comun-Transversal.md`, secciones 1, 2 y 14
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`, secciones 2, 6.4 y 24.4
