# ADR-0015 — Ramas cortas feature/fix, Conventional Commits, SemVer y controles locales sin CI/CD

- **Estado**: Aceptado
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo ("soy el único desarrollador; ramas cortas feature/fix, commits frecuentes, sin CI/CD por el momento")
- **Origen en la guía**: `01-Comun` §7 y §7.1 (branching y fixes), doc. base §13 y §25

## Contexto
Hay un solo desarrollador (con apoyo de un agente de IA), sin pipeline de CI/CD. Aun así se necesita trazabilidad, poder revertir y calidad mínima garantizada antes de integrar.

## Opciones consideradas
1. **Git Flow**. Contras: demasiadas ramas para una persona.
2. **GitHub Flow simplificado** (ramas cortas desde `main`, merge local). Pros: simple y compatible con un remoto futuro y PRs.
3. **Trunk-based puro** (commits directos a `main`). Contras: el usuario prefiere ramas por tarea.

## Decisión
- **GitHub Flow simplificado**: `main` siempre desplegable. Ramas cortas `feature/<fase>-<tema>`, `fix/<tema>`, `docs/…`, `chore/…`, `spike/…` (desechables).
- **Commits frecuentes** con **Conventional Commits** en español (`feat: agrega galería de fotos de ingreso`).
- Merge a `main` (local; PR opcional si hay remoto) solo con `npm run verify` en verde y la DoD cumplida.
- **Controles locales en lugar de CI**: husky `pre-commit` (lint-staged), `commit-msg` (commitlint) y `pre-push` (typecheck + tests).
- **SemVer** + `CHANGELOG.md` con `commit-and-tag-version`. Tags `vX.Y.Z`.
- **Hotfix**: rama `fix/` desde el tag en producción, fix mínimo, merge a `main`, tag PATCH y despliegue.
- Remoto privado (GitHub) recomendado como respaldo. GitHub Actions **no** se configura en v1.0. Si se agrega CI/CD, se hace con un ADR nuevo.

## Consecuencias
- **Positivas**: historial limpio, changelog automático y calidad forzada localmente.
- **Negativas**: los hooks se pueden saltar con `--no-verify` (prohibido en `CLAUDE.md`).

## Cumplimiento / verificación
Hooks instalados en la F0. `git log` con formato convencional. `deploy:prod` ejecuta `verify`.

## Referencias
- `CLAUDE.md` §8 · `docs/09` §2
