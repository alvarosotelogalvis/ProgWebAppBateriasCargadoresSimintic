# ADR-0001 — Registrar las decisiones de arquitectura mediante ADR

- **Estado**: Aceptado
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (dueño del producto y desarrollador)
- **Origen en la guía**: `Ambientes/07-ADR-Decisiones-Arquitectura.md` §6

## Contexto

La guía de buenas prácticas del usuario exige un ADR por decisión de arquitectura. La implementación la hará un agente de IA o un desarrollador distinto del que diseñó, así que debe saber **por qué** se tomó cada decisión y no volver a discutirla.

## Opciones consideradas

1. **ADR en `docs/adr/`** (formato Nygard/MADR de la guía). Pros: versionados con el código, inmutables y trazables. Contras: disciplina de mantenimiento.
2. **Solo un SDD**. Pros: un único documento. Contras: pierde el historial de cambios de decisión.

## Decisión

Usar ADR en `docs/adr/` con la plantilla de `Ambientes/Plantillas/ADR-0000-plantilla.md`, numeración secuencial de 4 dígitos, índice en `docs/adr/README.md` y reemplazo (nunca edición) cuando una decisión cambia. El SDD resume y enlaza los ADR.

## Consecuencias

- **Positivas**: historial claro; el agente implementador no reabre decisiones.
- **Negativas**: cada cambio de diseño requiere crear un ADR nuevo y actualizar el índice y `CLAUDE.md`.

## Cumplimiento / verificación

Revisión en cada merge a `main`: ¿la tarea introdujo una decisión sin ADR? Checklist de `07-ADR` §8 antes de cada release.

## Referencias

- `Ambientes/07-ADR-Decisiones-Arquitectura.md`
