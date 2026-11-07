# ADR-0007 — Permisos de Microsoft Graph: `Sites.Selected` delegado

- **Estado**: Aceptado (2026-11-07, tras la verificación en DEV de las specs 004 y 005)
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; aprobado por Álvaro Sotelo (2026-11-07)
- **Origen en la guía**: `01-Comun` §3 (autorización, menor privilegio), doc. base §4.3

## Contexto

La app escribe en un único sitio de SharePoint. Con permisos delegados, el acceso efectivo depende de los scopes de la app y de los permisos del usuario.

## Opciones consideradas

1. **`Sites.ReadWrite.All` delegado**. Pros: simple, sin un paso extra de grant. Contras: un token robado permite escribir en **cualquier** sitio donde el usuario tenga permiso.
2. **`Sites.Selected` delegado + grant `write` en el sitio**. Pros: el token solo sirve en el sitio concedido (intersección app ∩ usuario). Contras: un paso administrativo extra (POST `/sites/{id}/permissions`).
3. **SharePoint REST con su propio scope** (`AllSites.Write`). Contras: amplio y con una API distinta a Graph.

## Decisión

**`Sites.Selected` delegado** + `User.Read`, `openid`, `profile` y `offline_access`, con admin consent y un grant `write` sobre el sitio de cada ambiente (`docs/06` §1.7). Si el tenant no lo permite (spike S2), se crea un ADR que lo reemplace con `Sites.ReadWrite.All`.

## Consecuencias

- **Positivas**: menor privilegio, alineado con OWASP y con la guía.
- **Negativas**: el administrador debe hacer el grant por ambiente.

## Cumplimiento / verificación

Spike S2. Revisión de _API permissions_ del App Registration antes de PRD.

## Referencias

- `docs/06` §1.4, §1.7
