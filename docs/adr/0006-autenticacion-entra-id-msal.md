# ADR-0006 — Autenticación con Entra ID (MSAL.js, SPA + PKCE, delegado) y confirmación al sincronizar

- **Estado**: Aceptado (mecanismo) · Propuesto (roles de app y ventana de reautenticación de 12 h)
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (login con usuario del tenant al subir, sin backend); detalles propuestos por Claude
- **Origen en la guía**: `01-Comun` §3.0 (mecanismo de login), doc. base §7.1 (SSO / OpenID Connect empresarial), `02-App-Web.md` §3.10 (tokens en el cliente), `05-App-Movil.md` §5

## Contexto
- El usuario debe **confirmar su login** con una cuenta del tenant (o con permisos) al subir la información.
- La captura debe funcionar **sin conexión**, sin login en ese momento.
- No hay backend. La idea inicial de usar "credenciales del ID de aplicación" (client credentials) **no es segura en un cliente**: el secreto quedaría expuesto en el código descargado.

## Opciones consideradas
1. **Client credentials (secreto o certificado) en la app**. ❌ Expone una credencial con acceso de aplicación al tenant. Descartada.
2. **OAuth 2.0 auth code + PKCE, cliente público SPA, permisos delegados (MSAL.js)**. Pros: sin secretos, MFA y Acceso Condicional del tenant, SharePoint registra al usuario real. Contras: requiere conexión para el login interactivo. El refresh token de una SPA dura ~24 h, lo que en este caso favorece la confirmación periódica.
3. **Backend con identidad de aplicación + validación del token del usuario**. Descartada (no hay backend, ADR-0002).

Interacción: **redirect** vs. popup. Los popups fallan en PWAs standalone de iOS → **redirect**.

## Decisión
- **MSAL.js** (`@azure/msal-browser` + `@azure/msal-react`), App Registration con plataforma **SPA**, single tenant, **sin secretos**.
- Scopes: `openid profile offline_access User.Read Sites.Selected` (ADR-0007).
- Caché de MSAL en `localStorage` para conservar la cuenta entre aperturas de la PWA (ADR-0018).
- **Primer uso con conexión obligatorio** (configuración inicial): login y validación de `tid` y `roles`.
- **Sin conexión**: se captura con la cuenta cacheada; no se piden tokens.
- **Al sincronizar**: pantalla de confirmación **siempre** visible ("se subirán N registros como X") y luego:
  - Modo `confirmar` (por defecto): `acquireTokenSilent`. Si el último login interactivo tiene más de `SyncReautenticacionHoras` (12 h) o MSAL exige interacción → `acquireTokenRedirect` con `prompt=login`.
  - Modo `reautenticar` (configurable en `ConfiguracionApp`): login interactivo en cada sincronización.
- **App roles** `Tecnico`, `Comercial` y `Administrador` en el claim `roles`, con *Assignment required = Yes* (solo los usuarios asignados pueden entrar).

## Consecuencias
- **Positivas**: sin secretos, MFA nativo, trazabilidad real del usuario, revocación centralizada en Entra ID.
- **Negativas**: el primer uso exige conexión. Una sesión vencida pide login al sincronizar (esperado).
- **Riesgos**: (1) redirect en iOS standalone → spike S1. (2) Acceso Condicional que exija dispositivo administrado → spike S7 / PA-10.
- **Limitación aceptada**: los roles controlan la UI. SharePoint no distingue etapas (ADR-0018).

## Cumplimiento / verificación
Pruebas T-14 y T-18. Revisión del App Registration: sin *Certificates & secrets*. `CLAUDE.md` regla 2.

## Referencias
- SDD §8 · `docs/06` §1
