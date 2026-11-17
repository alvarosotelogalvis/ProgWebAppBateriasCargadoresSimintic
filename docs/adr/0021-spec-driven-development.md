# ADR-0021 — Adoptar Spec-Driven Development (constitución + spec/plan/tasks por funcionalidad)

- **Estado**: Aceptado
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (pidió SDD y specs para que otro agente de IA implemente)
- **Relacionado con**: [ADR-0001](0001-registrar-decisiones-de-arquitectura.md), [ADR-0016](0016-metodologia-kanban-personal.md)
- **Origen en la guía**: doc. base §1 (skill/prompt base para agentes de IA), §2 (spec del proyecto), §24.4 (trazabilidad)

## Contexto

La implementación la hará un agente de IA. El PRD y el SDD describen el sistema completo, pero un agente necesita unidades de trabajo acotadas con criterios verificables, el orden de las tareas y las rutas de archivos, además de principios que no pueda saltarse.

## Opciones consideradas

1. **Solo PRD + SDD + plan por fases**. Contras: el agente debe inferir el detalle y hay más riesgo de que se desvíe.
2. **Spec-Driven Development compatible con GitHub Spec Kit**: constitución + `specs/NNN/{spec,plan,tasks}.md`. Pros: formato conocido por los agentes, separa el qué (spec) del cómo (plan), da tareas atómicas con pruebas primero y una verificación explícita de los principios.
3. **Historias en un gestor externo (Jira o Azure Boards)**. Contras: fuera del repositorio y de la vista del agente.

## Decisión

- Constitución en `.specify/memory/constitution.md` (11 artículos).
- Una carpeta por funcionalidad en `specs/` (001–009), con `spec.md`, `plan.md` y `tasks.md`, y plantillas en `.specify/templates/`.
- Flujo **specify → clarify → plan → tasks → implement → verify**, con estados de spec `Borrador → Aprobada → En implementación → Implementada`.
- Los `docs/` (PRD, SDD, modelo de datos, ADR) siguen siendo la fuente de diseño. Los `plan.md` los citan y no los duplican. Si hay una diferencia de detalle, manda la spec aprobada y se actualiza el documento.
- La CLI de Spec Kit es opcional (`docs/05` §13).

## Consecuencias

- **Positivas**: el agente trabaja una spec a la vez con criterios Given/When/Then, y hay trazabilidad completa RF → FR → ES → T → prueba.
- **Negativas**: dos capas de documentación que mantener sincronizadas.
- **Mitigación**: la regla de "manda la spec aprobada" y la revisión al cerrar cada spec (DoD).

## Cumplimiento / verificación

Cada PR o merge referencia la spec (`feat(NNN): T###`). Cada `plan.md` tiene su verificación de la constitución completa.

## Referencias

- `specs/README.md` · `.specify/memory/constitution.md`
