# ADR-0018 — Seguridad de datos locales y tokens: sin cifrado propio de IndexedDB; caché MSAL en localStorage

- **Estado**: Propuesto (riesgo aceptado; requiere aprobación de Álvaro Sotelo)
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `02-App-Web.md` §3.10 ("no guardar tokens sensibles en localStorage sin protección"), `01-Comun` §3 (cifrado en reposo), `05-App-Movil.md` §5

## Contexto

- La guía recomienda cookies `HttpOnly` para los tokens, pero eso **requiere un backend** (no hay).
- La PWA instalada debe recordar al usuario entre aperturas para la confirmación de sync (ADR-0006). `sessionStorage` se borra al cerrar.
- Cifrar IndexedDB en la app requeriría una clave. Sin backend ni un secreto del usuario, la clave quedaría en el mismo dispositivo (ofuscación, no seguridad real). Una clave derivada de un PIN agregaría fricción y riesgo de perder los datos si se olvida el PIN.
- Datos: información de equipos, clientes corporativos, costos y fotos de equipos. **No** hay datos personales sensibles ni datos de pago.

## Opciones consideradas

1. **Caché MSAL en `sessionStorage`**. Contras: hay que iniciar sesión cada vez que se abre la app.
2. **Caché MSAL en `localStorage`** + mitigaciones contra XSS. Pros: la experiencia esperada.
3. **Cifrado de IndexedDB con una clave derivada de un PIN** (WebCrypto PBKDF2 + AES-GCM). Contras: fricción y pérdida de datos si se olvida el PIN.
4. **Sin cifrado propio**, confiando en el cifrado del dispositivo y el bloqueo de pantalla.

## Decisión

- MSAL con `cacheLocation: 'localStorage'` (opción 2).
- IndexedDB **sin cifrado a nivel de app** (opción 4).
- **Mitigaciones obligatorias**: CSP estricta sin scripts de terceros (SDD §14.2), ninguna inyección de HTML, auditoría de dependencias, scopes mínimos (`Sites.Selected`), tokens de acceso de vida corta (~1 h), refresh token de SPA limitado (~24 h), revocación de sesiones desde Entra ID en caso de pérdida, recomendación de bloqueo de pantalla y "Cerrar sesión" disponible.
- **Autorización por etapa solo en la UI**: un usuario con _Colaborar_ podría editar desde SharePoint web. Se acepta: el versionado de SharePoint y `CapturadoPor`/`DispositivoId` dan trazabilidad.

## Consecuencias

- **Positivas**: UX fluida y sin riesgo de pérdida por un PIN olvidado.
- **Riesgo aceptado**: si un atacante con acceso físico al dispositivo desbloqueado o un XSS obtiene el token, tendría acceso de escritura al sitio durante la vida del token.
- **Revisión**: si se incorporan datos sensibles (personales o financieros detallados), crear un ADR nuevo que evalúe la opción 3 o un backend con cookies `HttpOnly`.

## Cumplimiento / verificación

Revisión de CSP (spike S8). Regla de lint que prohíbe `localStorage` fuera de `infrastructure/auth` y `features/ajustes`.

## Referencias

- SDD §8.1, §14
