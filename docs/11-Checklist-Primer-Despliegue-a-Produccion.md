# Checklist — primer despliegue a producción

> Fecha: 2026-11-17 · Sitio de producción: `https://siminticsas.sharepoint.com/sites/MineroIndustrial` · Proyecto Cloudflare Pages: `st-bc-prod`.
> Complementa a `docs/06` (tenant), `docs/08` §5 (matriz de dispositivos) y `docs/09` (operación). Este documento es el **orden** en que hacerlo; cada paso dice quién lo hace, el comando y cómo comprobar que quedó bien.

**Leyenda de responsables:** 🔑 administrador de Entra / M365 · 📁 propietario del sitio SharePoint · 💻 desarrollador · 📱 persona con los dispositivos.

## 0. Dónde estamos hoy

**Ya hecho** (no repetir):

- Sitio `MineroIndustrial` aprovisionado: las 6 listas y bibliotecas, todas las columnas (incluidas las de clientes nuevos, fusión y número de solicitud), la carpeta de año `2026` y los datos iniciales (3 clientes de muestra, 1 marca, 17 claves de `ConfiguracionApp`).
- Código de las specs 001–011 en `main`; `npm run verify` verde; pruebas en vivo contra el sitio real 11/11; E2E 201 pasadas.
- Bundle inicial en producción: 329 KB (límite 350).

**Falta** (lo que cubre este checklist): App Registration de PRD, permisos del sitio, versión 1.0.0, Cloudflare, prueba en dispositivos y piloto.

## ⚠️ Tres cosas que rompen el lanzamiento si se olvidan

1. **`VersionMinimaApp` ya es `1.0.0` en SharePoint** y la app está en `0.1.0`: una app publicada sin pasar a **≥ 1.0.0** muestra "Actualiza la app" y **no puede sincronizar**. Por eso el release es `1.0.0` (paso D3).
2. **El grupo de técnicos necesita _Colaborar_ en `Clientes`.** Sin ese permiso nadie puede crear clientes nuevos y la sincronización de esos servicios fallará (paso C2).
3. **`deploy:prod` ahora compila y mide antes de subir.** Antes subía lo que hubiera en `dist/`, que suele ser un build de desarrollo con autenticación simulada. Ya está corregido (`package.json`); no uses `wrangler pages deploy` a mano sobre una carpeta `dist` que no acabes de compilar.

---

## A. Decisiones previas (5 minutos)

- [ ] **URL final de la app.** Con el proyecto `st-bc-prod` es `https://st-bc-prod.pages.dev/`. Si vas a usar un dominio propio (PA-11), decídelo **ahora**: la URL va en el App Registration y cambiarla después obliga a repetir el paso B.
- [ ] **Cuenta de Cloudflare**: ¿a nombre de la empresa? (PA-11). Quien la administre hace el paso D4.
- [ ] **Clientes de muestra**: los 3 de `Clientes` (NAVAR ASOCIADOS, ARIS MINING SEGOVIA, ARIS MINING MARMATO) salen de los ejemplos del Excel. Decide si se quedan o se reemplazan por los reales antes del piloto.

## B. Microsoft Entra ID — App Registration de producción 🔑

Detalle de cada pantalla en `docs/06` §1. Resumen:

- [ ] **B1. Crear el registro** `ServicioTec-PWA`: _single tenant_, plataforma **Single-page application**, Redirect URI `https://st-bc-prod.pages.dev/` (con la barra final).
- [ ] **B2. Añadir también** la URI de ensayo `https://prueba.st-bc-prod.pages.dev/` (la usa el paso E1; se puede quitar después).
- [ ] **B3. Authentication**: _Implicit grant_ y _hybrid flows_ **desmarcados**; _Allow public client flows_: **No**. **Sin secretos ni certificados.**
- [ ] **B4. Permisos delegados** de Microsoft Graph: `openid`, `profile`, `offline_access`, `User.Read`, `Sites.Selected` → **Grant admin consent**.
- [ ] **B5. App roles** (valores exactos): `Tecnico`, `Comercial`, `Administrador`.
- [ ] **B6. Enterprise application**: _Assignment required = Yes_ y asignar a cada usuario su rol.
- [ ] **B7. Anotar** el _Application (client) ID_ y el _Directory (tenant) ID_: van en `.env.production` (no son secretos).

**Comprobar:** en _Authentication_ aparece solo la plataforma SPA con las dos URIs; en _API permissions_ todo en verde con "Granted for …".

## C. SharePoint — permisos y ajustes del sitio 📁🔑

- [ ] **C1. Conceder el sitio a la app** (`Sites.Selected`, rol `write`) — `docs/06` §1.7. En Graph Explorer, con un administrador:
  1. `GET https://graph.microsoft.com/v1.0/sites/siminticsas.sharepoint.com:/sites/MineroIndustrial?$select=id` → copiar el `id`.
  2. `POST https://graph.microsoft.com/v1.0/sites/{id}/permissions` con `{"roles":["write"],"grantedToIdentities":[{"application":{"id":"<CLIENT_ID_PRD>","displayName":"ServicioTec-PWA"}}]}`.
- [ ] **C2. Permisos del grupo de técnicos** (el paso que Graph no puede hacer). Con PowerShell 7.2+ y `Install-Module PnP.PowerShell -Scope CurrentUser`, con la cuenta **propietaria del sitio**:
  ```powershell
  # 1) Ensayo: no cambia nada. Revisa lo que dice que va a hacer
  ./scripts/provision-sharepoint.ps1 -SiteUrl https://siminticsas.sharepoint.com/sites/MineroIndustrial -ClientId <ClientIdDePnP> -WhatIf
  # 2) Aplicar (es idempotente: no duplica listas ni columnas)
  ./scripts/provision-sharepoint.ps1 -SiteUrl https://siminticsas.sharepoint.com/sites/MineroIndustrial -ClientId <ClientIdDePnP> -ConfigurarRegional
  ```
  Deja el grupo `ServicioTecnico-Usuarios` con **Colaborar** en `Servicios`, `ServiciosAdjuntos`, `LogSincronizacion` y **`Clientes`**, y **Leer** en `Marcas` y `ConfiguracionApp`; activa el versionado (50), crea las vistas y fija la zona horaria de Bogotá.
  > Este script solo se ha probado contra una simulación (`npm run test:ps-provision`), nunca contra un sitio real: por eso el `-WhatIf` primero y revisar el resultado.
- [ ] **C3. Agregar a los usuarios** al grupo `ServicioTecnico-Usuarios` (los mismos que asignaste en B6).
- [ ] **C4. Zona horaria**: _Configuración del sitio → Configuración regional_ debe decir **(UTC-05:00) Bogotá**. Hoy parece UTC-7 y desplaza las fechas de solo fecha.
- [ ] **C5. Borrar el secreto temporal** de la app `serviteca-provision-temp` en Entra (ya no se usa para nada).
- [ ] **C6. Comprobar el esquema** (lectura): `node scripts/provision-sharepoint-graph.mjs --site siminticsas.sharepoint.com/sites/MineroIndustrial --env-file <ruta/.env>` debe terminar con **0 creados** y sin avisos de columnas por corregir.

**Comprobar:** con una cuenta de prueba que **no** sea propietaria, en el sitio puede crear un ítem en `Clientes` y en `Servicios`, y **no** puede editar `ConfiguracionApp`.

## D. Código y versión 💻

- [ ] **D1. Integrar el trabajo pendiente.** Hoy hay ramas sin integrar en `main` (`chore/optimizar-bundle` y `docs/checklist-despliegue`). Haz el merge a `main` y `git status` limpio.
- [ ] **D2. Verificaciones**, todas en verde: `npm run verify`, `npm run test:e2e`, `npm audit --omit=dev` (sin altas ni críticas).
- [ ] **D3. Versión 1.0.0.** `.versionrc.json` **no** toca el `CHANGELOG`, así que primero a mano:
  1. En `CHANGELOG.md` renombra `## [Unreleased]` a `## [1.0.0] - AAAA-MM-DD`.
  2. Ensayo: `npm run release -- --release-as 1.0.0 --dry-run`.
  3. Real: `npm run release -- --release-as 1.0.0` y luego `git push --follow-tags`.

  **Comprobar:** `package.json` dice `1.0.0` y existe el tag `v1.0.0`.

- [ ] **D4. Cloudflare.** Una sola vez:
  ```bash
  npm install -D wrangler          # hoy NO está instalado: los scripts de despliegue lo necesitan
  npx wrangler login
  npx wrangler pages project create st-bc-prod --production-branch main
  ```
- [ ] **D5. `.env.production`** (copia de `.env.production.example`; **no se sube a git**):
  ```
  VITE_APP_ENV=prd
  VITE_AUTH_MODE=msal
  VITE_ENTRA_CLIENT_ID=<del paso B7>
  VITE_ENTRA_TENANT_ID=<del paso B7>
  VITE_SHAREPOINT_SITE_URL=https://siminticsas.sharepoint.com/sites/MineroIndustrial
  VITE_SHAREPOINT_SITE_NAME=MineroIndustrial
  ```
  El build de producción **falla a propósito** si `VITE_AUTH_MODE=mock` o si falta algún valor.

## E. Despliegue 💻

- [ ] **E1. Ensayo en vista previa** (no toca la URL de producción): `npm run deploy:prueba` → `https://prueba.st-bc-prod.pages.dev/`.
      Corre `verify`, compila en producción, mide el bundle y sube a la rama `prueba`. Haz con ella el paso F completo.
  > No existe un ambiente DEV con su propio sitio y App Registration (ADR-0020). Esta vista previa usa los datos reales de PRD: usa solo datos de prueba y bórralos después.
- [ ] **E2. Producción**, solo si F salió bien: `npm run deploy:prod` → `https://st-bc-prod.pages.dev/`.
- [ ] **E3. Quitar la URI de ensayo** del App Registration (B2) cuando ya no la uses.

## F. Verificación después de desplegar 💻📱

En la URL de ensayo primero y otra vez en producción.

- [ ] **F1. Cabeceras**: `curl -sI <URL>` muestra `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- [ ] **F2. Enlace profundo**: abrir `<URL>/servicios` directamente carga la app (no un 404).
- [ ] **F3. Acerca de** muestra la versión `1.0.0`.
- [ ] **F4. Instalar** la app (M-01) y abrirla sin red (M-02).
- [ ] **F5. Login real** con una cuenta con rol (M-03, M-04). Una cuenta **sin** rol debe ver "Tu cuenta no tiene acceso a esta app".
- [ ] **F6. Configuración inicial**: descarga clientes, marcas y configuración (sin errores).
- [ ] **F7. Recepción completa en modo avión** con 1 foto (M-08); al volver la red, confirmar y sincronizar (M-09). Comprobar en SharePoint: el ítem en `Servicios`, la foto en `ServiciosAdjuntos/2026/{ServicioId}/`, **un número de solicitud asignado** y el código `BAT-N-serie` (ya sin `PEND`).
- [ ] **F8. Cliente nuevo** escrito en el formulario → tras sincronizar aparece **una sola vez** en `Clientes`. (Falla si C2 no se hizo.)
- [ ] **F9. Corte de red durante la sincronización** (M-10): reintenta sin duplicar.
- [ ] **F10. Actualización** (M-12): publicar un cambio mínimo en la vista previa y ver el aviso "Hay una nueva versión".
- [ ] **F11. Limpiar** los datos de prueba (ítems, carpeta del servicio y clientes de prueba) antes del piloto.

Matriz completa `docs/08` §5 (M-01…M-14) en **Android Chrome, iPhone Safari y Windows Edge** (📱). En iPhone la app debe instalarse (M-11: sin instalar iOS borra los datos a los 7 días).

## G. Piloto y cierre

- [ ] **G1. Piloto** de 1 semana con 2–3 usuarios reales (F10.7).
- [ ] **G2. Revisión diaria** de `LogSincronizacion`: resultados `Error` o `Parcial`, y de **Técnico → Registros** en los dispositivos.
- [ ] **G3. Criterios de salida**: matriz sin ✗ en las 3 plataformas principales, ningún dato perdido ni servicio duplicado, ningún error recurrente sin causa.
- [ ] **G4. Cierre administrativo**: pasar a `Aceptado` los ADR `Propuesto` confirmados (`docs/F10-ADR-REVIEW.md`, F10.8) y marcar F10 como cerrada en `docs/07`.

## Si algo sale mal

| Situación                                 | Qué hacer                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| La versión nueva falla en producción      | Cloudflare Pages → proyecto → _Deployments_ → el anterior → **Rollback** (instantáneo). Los datos locales no se pierden.    |
| "Actualiza la app para sincronizar"       | `VersionMinimaApp` (SharePoint → `ConfiguracionApp`) es mayor que la versión publicada. Publica la versión o baja la clave. |
| "Sin permiso en SharePoint"               | Falta el grant `Sites.Selected` (C1) o el usuario no está en el grupo (C3).                                                 |
| Un técnico no puede crear clientes        | Falta _Colaborar_ en `Clientes` (C2).                                                                                       |
| Login repetido o bloqueado en el teléfono | Acceso Condicional (`docs/06` §1.8).                                                                                        |
| Fechas corridas un día                    | Zona horaria del sitio (C4).                                                                                                |

## Fuera de alcance de este lanzamiento

- **Power Automate** (correo de la OT y alertas de vida útil): sin licencia. Las claves `CorreoDestinoOT`/`CorreoDestinoAlertas` no existen y no hacen falta; la app funciona sin ellas.
- **Lighthouse en frío**: la primera carga en frío da 83 (el uso normal con la app instalada, 98–99). Decisión pendiente en `docs/F10-RENDIMIENTO-Y-RELEASE.md`.
- **Fuentes**: Montserrat (4 pesos, ~74 KB) no entra en el presupuesto del bundle.
