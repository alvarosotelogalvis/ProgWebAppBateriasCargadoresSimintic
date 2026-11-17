# Despliegue, operación y soporte

> Decisiones relacionadas: ADR-0014 (hosting y actualización), ADR-0015 (versionado), ADR-0017 (observabilidad), ADR-0020 (ambientes).

## 1. Ambientes y URLs

> **Primer despliegue a producción:** sigue `docs/11-Checklist-Primer-Despliegue-a-Produccion.md` (orden, responsables y comprobaciones).

| Ambiente                  | Comando                 | Proyecto Cloudflare / rama | URL                                                      | Config                                                             |
| ------------------------- | ----------------------- | -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| DEV (si existe, ADR-0020) | `npm run deploy:dev`    | `st-bc-dev` / `dev`        | `https://dev.st-bc-dev.pages.dev`                        | `.env.development` (sitio y App Registration DEV)                  |
| Ensayo en vista previa    | `npm run deploy:prueba` | `st-bc-prod` / `prueba`    | `https://prueba.st-bc-prod.pages.dev`                    | `.env.production` (datos reales de PRD: usar solo datos de prueba) |
| PRD                       | `npm run deploy:prod`   | `st-bc-prod` / `main`      | `https://st-bc-prod.pages.dev` (o dominio propio, PA-11) | `.env.production`                                                  |

Scripts de `package.json` (los de producción **compilan y miden antes de subir**; nunca suben un `dist/` viejo):

```json
{
  "build": "tsc --noEmit && vite build",
  "build:dev": "tsc --noEmit && vite build --mode development",
  "bundle:medir": "node scripts/medir-bundle.mjs",
  "deploy:dev": "npm run verify && npm run build:dev && wrangler pages deploy dist --project-name st-bc-dev --branch dev",
  "deploy:prueba": "npm run verify && npm run build && npm run bundle:medir && wrangler pages deploy dist --project-name st-bc-prod --branch prueba",
  "deploy:prod": "npm run verify && npm run build && npm run bundle:medir && wrangler pages deploy dist --project-name st-bc-prod --branch main"
}
```

> Sin CI/CD (ADR-0015): el despliegue lo ejecuta el desarrollador desde su PC. `wrangler` se instala con `npm install -D wrangler` (hoy no está en `package.json`) y se autentica con `npx wrangler login`.

## 2. Versionado

- **SemVer** `MAJOR.MINOR.PATCH`. MAJOR = cambio incompatible del esquema local o del modelo de SharePoint. MINOR = funcionalidad nueva. PATCH = corrección.
- `npm run release` (`commit-and-tag-version`) calcula la versión desde los Conventional Commits, actualiza `package.json` y `CHANGELOG.md` y crea el tag `vX.Y.Z`.
- La versión se ve en **Acerca de** junto con el commit y la fecha de build.
- `VersionMinimaApp` en `ConfiguracionApp` obliga a actualizar cuando un cambio lo requiere (por ejemplo, una columna nueva en SharePoint).

## 3. Checklist de release

- [ ] `main` actualizado y `npm run verify` en verde.
- [ ] Pruebas E2E en verde (`npm run test:e2e`).
- [ ] `npm audit --omit=dev` sin altas ni críticas.
- [ ] Bundle inicial ≤ 350 KB gzip: `npm run build` y luego `npm run bundle:medir` (falla si la carga inicial —entrada, CSS y MSAL— supera el presupuesto). Medido el 2026-11-17 con un build de producción: **329 KB**.
- [ ] Lighthouse móvil ≥ 90 en la URL de DEV.
- [ ] Si cambió el esquema de Dexie: hay una migración con prueba que conserva pendientes.
- [ ] Si cambió SharePoint: columnas creadas **antes** del despliegue en DEV y PRD; `VersionMinimaApp` actualizado **después** del despliegue.
- [ ] `npm run release` → tag creado → `git push --follow-tags` (si hay remoto).
- [ ] `npm run deploy:dev` → prueba rápida (M-02, M-08, M-09) → `npm run deploy:prod`.
- [ ] ADRs y documentación al día.

## 4. Instalación para usuarios finales (contenido de la guía)

Se comparte un enlace o un QR con la URL de PRD. Pasos por dispositivo:

| Dispositivo                    | Pasos                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Android (celular o tablet)** | 1) Abrir el enlace en **Chrome**. 2) Tocar **Instalar** (aviso o botón de la app) o ⋮ → _Instalar aplicación_. 3) Abrir **ServicioTec** desde el ícono. 4) Hacer la configuración inicial con conexión |
| **iPhone / iPad**              | 1) Abrir el enlace en **Safari** (no en otro navegador). 2) Botón **Compartir** → **Agregar a pantalla de inicio** → Agregar. 3) Abrir desde el ícono. 4) Configuración inicial                        |
| **Windows**                    | 1) Abrir en **Edge**. 2) Ícono **Instalar** (⊕) en la barra de direcciones o el botón de la app. 3) Queda en el menú Inicio; se puede anclar a la barra de tareas. 4) Configuración inicial            |
| **Mac**                        | Chrome/Edge: ícono Instalar en la barra de direcciones. Safari 17+: Archivo → **Agregar al Dock**                                                                                                      |

Recomendaciones para el usuario: bloqueo de pantalla activado en el dispositivo, sincronizar al menos una vez al día y no borrar los datos del navegador.

## 5. Actualizaciones de la app

- Al publicar, cada dispositivo descarga la nueva versión **la próxima vez que abre la app con conexión** (o dentro de 60 min si está abierta) y muestra "Hay una nueva versión – Actualizar".
- Los datos locales **no se pierden** al actualizar (las migraciones de Dexie son aditivas).
- Si un usuario no actualiza y la versión es menor que `VersionMinimaApp`, puede seguir capturando pero no sincronizar hasta actualizar.

## 6. Rollback

1. Cloudflare Pages → proyecto → _Deployments_ → el despliegue anterior → **Rollback** (instantáneo). O volver a desplegar el tag anterior: `git checkout vX.Y.Z && npm ci && npm run deploy:prod`.
2. **Restricción**: si la versión retirada subió la versión del esquema de Dexie, la versión anterior **no** puede abrir esa base. Por eso, todo release con migración de DB se prueba en DEV una semana antes. Si hace falta revertir, se publica un PATCH hacia adelante (fix-forward), no un rollback.
3. Si el cambio implicó SharePoint, las columnas nuevas no se eliminan (las versiones anteriores las ignoran).

## 7. Respaldo y recuperación (guía base §21, §25 DRP)

| Activo                                   | Respaldo                                                                                                       | RPO                  | RTO                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------ |
| Datos sincronizados (SharePoint)         | Versionado de lista y biblioteca + papelera de reciclaje (93 días) + retención de M365 (si el tenant la tiene) | Según M365           | Según M365         |
| Datos **no** sincronizados (dispositivo) | Solo en el dispositivo. Respaldo ZIP manual (menú técnico)                                                     | Desde la última sync | —                  |
| Código y documentación                   | Git local + remoto privado (GitHub)                                                                            | Último push          | Minutos            |
| App publicada                            | Cloudflare guarda los despliegues anteriores                                                                   | —                    | Minutos (rollback) |
| Configuración del tenant                 | Este documento + `docs/06` + export de los flujos en `docs/powerautomate/`                                     | —                    | Horas              |

**Dispositivo perdido o dañado**: lo sincronizado está en SharePoint. Se instala la app en otro dispositivo, se hace la configuración inicial y se recupera todo lo sincronizado. Lo no sincronizado se pierde, salvo que exista un respaldo ZIP (se importa desde el menú técnico, como Admin).

## 8. Soporte: problemas frecuentes

| Síntoma                                          | Causa probable                                                                 | Acción                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| "Tu cuenta no tiene acceso a esta app"           | Usuario sin rol asignado en la Enterprise App                                  | El administrador lo asigna (06 §1.6)                                          |
| Error "Sin permiso en SharePoint" al sincronizar | El usuario no está en el grupo _Colaborar_, o falta el grant `Sites.Selected`  | 06 §2.5 y §1.7                                                                |
| El login se repite o falla en el teléfono        | Acceso Condicional (dispositivo no administrado)                               | 06 §1.8                                                                       |
| No aparece un cliente                            | No existe o está inactivo en `Clientes`, o no se han refrescado los catálogos  | Agregarlo en SharePoint → en la app, sincronizar o _Refrescar catálogos_      |
| "Almacenamiento casi lleno"                      | Muchas fotos sin sincronizar                                                   | Sincronizar; luego _Liberar espacio_                                          |
| iPhone: "desaparecieron los datos"               | La app se usaba en Safari sin instalar, o el usuario borró los datos del sitio | Prevención: instalación obligatoria en iOS; se recupera lo sincronizado       |
| Sincronización con error persistente             | Ver el mensaje en Sincronización → Con error                                   | Menú técnico → Registros → exportar y enviar a soporte con el `correlationId` |
| "Actualiza la app para sincronizar"              | La versión es menor que `VersionMinimaApp`                                     | Menú técnico → _Buscar actualización_; cerrar y abrir la app                  |

## 9. Operación periódica

| Frecuencia | Tarea                                                                             | Responsable        |
| ---------- | --------------------------------------------------------------------------------- | ------------------ |
| Semanal    | Revisar `LogSincronizacion` (resultados `Error` o `Parcial`)                      | Admin del servicio |
| Mensual    | `npm outdated` + `npm audit`; actualizar dependencias menores                     | Desarrollador      |
| Mensual    | Revisar las ejecuciones fallidas de los flujos de Power Automate                  | Admin              |
| Trimestral | Revisar los ADR (¿alguno obsoleto?) y la deuda técnica                            | Desarrollador      |
| Anual      | Revisar la expiración del dominio propio (si existe) y de las cuentas de servicio | Admin              |
