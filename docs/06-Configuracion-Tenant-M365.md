# Configuración del tenant Microsoft 365 (Entra ID, SharePoint, Power Automate)

> Lo ejecuta un **administrador** del tenant (Entra ID y SharePoint), acompañado del desarrollador. Se hace **una vez por ambiente** (DEV y PRD).
> Decisiones relacionadas: ADR-0006, ADR-0007, ADR-0009, ADR-0013, ADR-0020.

## 0. Datos que hay que definir antes
| Dato | DEV | PRD |
|---|---|---|
| Nombre del App Registration | `ServicioTec-PWA-DEV` | `ServicioTec-PWA` |
| URL del sitio SharePoint (PA-14) | `https://<tenant>.sharepoint.com/sites/ServicioTecnicoBC-DEV` | `https://<tenant>.sharepoint.com/sites/ServicioTecnicoBC` |
| URL de la app (Redirect URI) | `http://localhost:5173/`, `http://localhost:4173/`, `https://dev.servicio-tecnico-pwa.pages.dev/` | `https://servicio-tecnico-pwa.pages.dev/` (o dominio propio) |
| Correo para la OT (PA-04) | correo de pruebas | lista de distribución real |
| Correo para las alertas (PA-05) | correo de pruebas | lista real |

---

## 1. Microsoft Entra ID — App Registration

### 1.1 Crear el registro
1. **Entra admin center** → *Identity* → *Applications* → *App registrations* → **New registration**.
2. **Name**: `ServicioTec-PWA-DEV`.
3. **Supported account types**: *Accounts in this organizational directory only* (single tenant).
4. **Redirect URI**: plataforma **Single-page application (SPA)** → `http://localhost:5173/`.
5. **Register**. Anotar el **Application (client) ID** y el **Directory (tenant) ID**. Van en `.env.development` y **no son secretos**.

### 1.2 Authentication
- En la plataforma *Single-page application*, agregar el resto de Redirect URIs del ambiente (§0). Cada una termina en `/`.
- **Front-channel logout URL**: vacío.
- *Implicit grant and hybrid flows*: **ambas casillas desmarcadas** (se usa auth code + PKCE).
- *Allow public client flows*: **No** (no aplica a SPA).

### 1.3 Certificates & secrets
- **No crear secretos ni certificados.** La app es un cliente público.

### 1.4 API permissions (delegados)
*Add a permission* → *Microsoft Graph* → *Delegated permissions*:
| Permiso | Para qué |
|---|---|
| `openid`, `profile`, `offline_access` | Login OIDC y refresh token |
| `User.Read` | Nombre y correo del usuario |
| `Sites.Selected` | Leer y escribir **solo** en el sitio concedido (§1.7) |

→ **Grant admin consent for <tenant>**.
> Si el tenant no permite `Sites.Selected` delegado, la alternativa es `Sites.ReadWrite.All` delegado (ADR-0007). En ese caso la app puede escribir donde el usuario ya tenga permiso: se acota con los permisos de SharePoint.

### 1.5 App roles
*App roles* → **Create app role** (tres veces):
| Display name | Allowed member types | Value | Description |
|---|---|---|---|
| Técnico | Users/Groups | `Tecnico` | Recepción, diagnóstico, OT y entrega |
| Comercial | Users/Groups | `Comercial` | Cotización y facturación |
| Administrador | Users/Groups | `Administrador` | Todo, más anulación y corrección |

El `Value` debe ser **exacto**: la app lo lee del claim `roles` del ID token.

### 1.6 Enterprise application (restringir quién entra)
1. *Enterprise applications* → `ServicioTec-PWA-DEV` → *Properties* → **Assignment required? = Yes** → Save.
2. *Users and groups* → **Add user/group** → elegir usuarios (o grupos) y su **rol**.
   > Asignar **grupos** requiere Entra ID P1/P2. Sin esa licencia, se asignan usuarios uno por uno.
3. *Properties* → *Visible to users?*: **Yes** (opcional: aparece en `myapps.microsoft.com` con la URL de la app como "Home page URL").

### 1.7 Conceder el sitio a la app (`Sites.Selected`)
Después de crear el sitio (§2), el administrador concede permiso **write** a la app sobre **ese** sitio:

**Opción A — Graph Explorer** (`https://developer.microsoft.com/graph/graph-explorer`, con un administrador que consienta `Sites.FullControl.All` para Graph Explorer):
```http
GET https://graph.microsoft.com/v1.0/sites/<tenant>.sharepoint.com:/sites/ServicioTecnicoBC-DEV?$select=id
```
```http
POST https://graph.microsoft.com/v1.0/sites/{siteId}/permissions
Content-Type: application/json

{
  "roles": ["write"],
  "grantedToIdentities": [
    { "application": { "id": "<CLIENT_ID_DEV>", "displayName": "ServicioTec-PWA-DEV" } }
  ]
}
```
**Opción B — PnP.PowerShell**:
```powershell
Connect-PnPOnline -Url https://<tenant>.sharepoint.com/sites/ServicioTecnicoBC-DEV -Interactive -ClientId <ClientIdDePnP>
Grant-PnPAzureADAppSitePermission -AppId <CLIENT_ID_DEV> -DisplayName "ServicioTec-PWA-DEV" -Permissions Write
```
Con `Sites.Selected` **delegado**, el acceso efectivo es la **intersección**: la app debe tener el permiso en el sitio **y** el usuario debe tener permiso en SharePoint (§2.5).

### 1.8 Acceso Condicional (PA-10, spike S7)
- Revisar con el administrador si alguna política exige *dispositivo compatible*, *dispositivo unido* o *app aprobada* para "All cloud apps" o para SharePoint.
- Los dispositivos son **no administrados**. Si una política lo exige, el login funcionará pero Graph o SharePoint rechazarán el acceso. Opciones:
  - Excluir la app `ServicioTec-PWA` de esa política, manteniendo MFA obligatorio.
  - O una política específica: MFA + ubicación o riesgo, sin exigir dispositivo administrado.
- **MFA**: recomendado (y probablemente ya exigido por el tenant). La app lo soporta sin cambios (el login es de Microsoft).

---

## 2. SharePoint Online

### 2.1 Crear el sitio
1. **SharePoint admin center** → *Sites* → *Active sites* → **Create** → **Communication site** (o *Team site* sin grupo de M365).
2. Nombre: `Servicio Técnico BC (DEV)`. Dirección: `/sites/ServicioTecnicoBC-DEV`. Idioma: **Español**.
3. *Site settings* → *Regional settings*: **zona horaria (UTC-05:00) Bogota, Lima, Quito**, configuración regional **Español (Colombia)**.

### 2.2 Regla para crear columnas (nombres internos)
SharePoint fija el **nombre interno** con el primer nombre que se le da a la columna. Por eso:
1. Crear cada columna con el nombre interno **exacto** del modelo de datos (ej. `FechaRecepcion`, sin tildes ni espacios).
2. Después, si se desea, cambiar el *nombre para mostrar* (ej. "Fecha de recepción").

### 2.3 Listas y biblioteca
Crear según `03-Modelo-de-Datos.md`:

**Lista `Servicios`** (lista en blanco). Renombrar `Title` como "Código". Columnas:
| Nombre interno | Tipo | Configuración |
|---|---|---|
| `ServicioId` | Una línea de texto | Obligatoria, **Exigir valores únicos = Sí** (crea el índice) |
| `Estado` | Opción | Recibido, Diagnosticado, Cotizado, En reparación, Entregado, Facturado, Disposición final, Anulado |
| `TipoEquipo` | Opción | Batería, Cargador |
| `FechaRecepcion` | Fecha y hora | Solo fecha |
| `Cliente` | Búsqueda | Lista `Clientes`, columna `Title` (crear `Clientes` antes) |
| `NumeroSolicitud` | Número | 0 decimales |
| `Marca` | Una línea de texto | 60 |
| `Referencia` | Una línea de texto | 50 |
| `SerieEquipo` | Una línea de texto | 50 |
| `Diagnostico` | Opción | Valores de PA-01 (por defecto: Reparable, Garantía, Sin falla, D. FINAL). Permitir rellenar = No |
| `ObservacionTecnica` | Varias líneas de texto | Texto sin formato |
| `FechaSocializacionDF` | Fecha y hora | Solo fecha |
| `CotizacionFechaEnvio` | Fecha y hora | Solo fecha |
| `CotizacionValor` | Moneda | Español (Colombia), 0 decimales |
| `CotizacionEstado` | Opción | Pendiente, Aprobada, Rechazada |
| `OTDetalle` | Varias líneas de texto | Texto sin formato |
| `OTCostoReparacion` | Moneda | COP, 0 decimales |
| `OTCorreoEnviado` | Sí/No | Predeterminado: No |
| `FechaEntrega` | Fecha y hora | Solo fecha |
| `ProyeccionVidaUtil` | Fecha y hora | Solo fecha |
| `AlertaVidaUtilNivel` | Opción | Ninguna, 90, 60, 30, Vencida. Predeterminado: Ninguna |
| `FacturaNumero` | Una línea de texto | 30 |
| `FacturaFecha` | Fecha y hora | Solo fecha |
| `CapturadoPor` | Una línea de texto | — |
| `CapturadoPorNombre` | Una línea de texto | — |
| `CapturadoEn` | Fecha y hora | Fecha y hora |
| `ActualizadoEnDispositivo` | Fecha y hora | Fecha y hora |
| `DispositivoId` | Una línea de texto | — |
| `AppVersion` | Una línea de texto | — |
| `UrlCarpetaAdjuntos` | Varias líneas de texto | Texto sin formato |
| `MotivoAnulacion` | Varias líneas de texto | Texto sin formato |
| `FechaAnulacion` | Fecha y hora | Solo fecha |

*Configuración de la lista*:
- *Versiones*: crear una versión cada vez que se edite = Sí, conservar 50.
- *Avanzada*: datos adjuntos = **Deshabilitado**.
- *Columnas indizadas*: `Estado`, `SerieEquipo`, `NumeroSolicitud`, `ProyeccionVidaUtil`, `Modified` (`ServicioId` ya queda indexada por ser única).

**Lista `Clientes`**: `Title` (Nombre), `NIT` (texto), `Activo` (Sí/No, predeterminado Sí), `CorreoContacto` (texto). Datos: NAVAR ASOCIADOS, ARIS MINING SEGOVIA, ARIS MINING MARMATO.

**Lista `Marcas`**: `Title`, `Activo` (Sí/No). Dato: ROQUET.

**Lista `ConfiguracionApp`**: `Title` (Clave), `Valor` (varias líneas, texto sin formato), `Descripcion` (varias líneas). Cargar las claves de `03-Modelo-de-Datos.md` §6.3 con sus valores por defecto y los correos.

**Lista `LogSincronizacion`**: columnas de `03-Modelo-de-Datos.md` §6.4. Versiones: no. Opcional: retención de 12 meses con una etiqueta de Purview.

**Biblioteca `ServiciosAdjuntos`** (biblioteca de documentos): columnas `ServicioId` (texto, indexada), `AdjuntoId` (texto, indexada), `TipoAdjunto` (opción: Foto ingreso, Foto salida, Formato diagnóstico, Cotización, Factura, Disposición final), `FechaCaptura` (fecha y hora), `CapturadoPor` (texto). Versiones: principales, 50.

### 2.4 Vistas sugeridas (reportes sin app)
En `Servicios`: *Abiertos por estado* (agrupar por Estado; filtro Estado ≠ Facturado, Disposición final, Anulado), *Por cliente*, *Vida útil próxima* (ProyeccionVidaUtil ≤ [Hoy]+90; Estado = Entregado o Facturado), *Pendientes de facturar*, *Disposiciones finales*.

### 2.5 Permisos
| Grupo de SharePoint | Miembros | `Servicios`, `ServiciosAdjuntos`, `LogSincronizacion` | `Clientes`, `Marcas`, `ConfiguracionApp` |
|---|---|---|---|
| Propietarios | Administradores del servicio | Control total | Control total |
| Usuarios ServicioTec | Todos los usuarios asignados a la app | **Colaborar** | **Leer** (romper herencia en estas 3 listas) |

> Mantener los miembros de "Usuarios ServicioTec" alineados con las asignaciones de la Enterprise App. Lo ideal es un mismo grupo de seguridad de Entra usado en los dos lugares.

### 2.6 Aprovisionamiento por script (opcional)
La Fase 4 del plan incluye `scripts/provision-sharepoint.ps1` (PnP.PowerShell). El script crea las listas, columnas (con nombres internos), índices, versiones, vistas, datos iniciales y claves de configuración de forma **idempotente** (si existe, no lo duplica). Recibe `-SiteUrl` y `-ClientId` (el App Registration de PnP).

---

## 3. Power Automate (correos y alertas) — ADR-0013

> Crear los flujos con una **cuenta de servicio** o con **dos copropietarios**, para que no dependan de una sola persona. Conectores estándar: SharePoint y Office 365 Outlook (incluidos en M365).

### 3.1 Flujo "ServicioTec – Correo OT"
1. **Desencadenador**: *SharePoint – When an item is created or modified*. Sitio: el del ambiente. Lista: `Servicios`.
2. **Condición del desencadenador** (*Settings → Trigger conditions*), para evitar bucles y ejecuciones innecesarias:
   ```
   @and(equals(triggerOutputs()?['body/Estado/Value'], 'En reparación'), equals(triggerOutputs()?['body/OTCorreoEnviado'], false))
   ```
3. **Get items** en `ConfiguracionApp` con filtro `Title eq 'CorreoDestinoOT'` → tomar `Valor`.
4. **Send an email (V2)**:
   - Para: `Valor`.
   - Asunto: `OT interna – @{triggerOutputs()?['body/Title']} – @{triggerOutputs()?['body/Cliente/Value']}`.
   - Cuerpo (HTML): tipo de equipo, cliente, solicitud, marca, referencia, serie, diagnóstico, **detalle de la OT**, **costo de reparación interna**, capturado por, enlace al ítem (`{Link to item}`) y a la carpeta de adjuntos (`UrlCarpetaAdjuntos`).
5. **Update item**: `OTCorreoEnviado = Sí`, **solo si el envío fue exitoso** (*Configure run after → is successful*). Si el envío falla, el ítem queda en No y se reprocesa en la próxima modificación o reenviando manualmente.
6. Ante un error: rama *Configure run after → has failed* → correo al propietario del flujo.

### 3.2 Flujo "ServicioTec – Alertas de vida útil"
1. **Desencadenador**: *Recurrence*, cada día a las 07:00, zona `(UTC-05:00) Bogota`.
2. **Get items** en `ConfiguracionApp`: `CorreoDestinoAlertas` y `UmbralesAlertaDias`.
3. **Get items** en `Servicios`, con *Filter Query*:
   ```
   (Estado eq 'Entregado' or Estado eq 'Facturado') and ProyeccionVidaUtil le '@{formatDateTime(addDays(utcNow(), 90), 'yyyy-MM-dd')}'
   ```
   *Top Count* 5000 y paginación activada.
4. **Apply to each** ítem:
   - `dias = div(sub(ticks(item()?['ProyeccionVidaUtil']), ticks(startOfDay(utcNow()))), 864000000000)`
   - `nivel = Vencida` si dias < 0; `30` si dias ≤ 30; `60` si ≤ 60; `90` si ≤ 90.
   - Si `nivel` es **más urgente** que `AlertaVidaUtilNivel` (orden: Ninguna < 90 < 60 < 30 < Vencida): agregar a un arreglo `alertas` y **Update item** `AlertaVidaUtilNivel = nivel`.
   - Si el nivel **bajó** (p. ej., un Admin corrigió la fecha hacia adelante): **Update item** con el nuevo nivel **sin** agregarlo al correo.
5. Si `alertas` no está vacío: **Create HTML table** + **Send an email (V2)** a `CorreoDestinoAlertas` con el asunto `Alertas de vida útil – @{length(variables('alertas'))} equipos`.

### 3.3 Pruebas de los flujos
- Crear un servicio en DEV, pasarlo a "En reparación" desde la app, sincronizar → llega el correo y `OTCorreoEnviado` queda en Sí.
- Poner en DEV una `ProyeccionVidaUtil` = hoy + 20 en un ítem Entregado → ejecutar el flujo manualmente → llega el correo con nivel 30. Al ejecutarlo otra vez no se repite.

---

## 4. Lista de verificación del administrador
- [ ] App Registration creado (DEV/PRD), Redirect URIs SPA, sin secretos.
- [ ] Permisos delegados + **admin consent** concedido.
- [ ] App roles creados y usuarios asignados. *Assignment required = Yes*.
- [ ] Sitio creado con zona horaria de Bogotá y es-CO.
- [ ] Listas, columnas (nombres internos exactos), índices, valor único en `ServicioId`, versiones.
- [ ] Datos iniciales: clientes, marcas, `ConfiguracionApp`.
- [ ] Permisos de SharePoint: Colaborar / Leer según §2.5.
- [ ] Permiso `write` de `Sites.Selected` concedido a la app sobre el sitio.
- [ ] Acceso Condicional revisado para dispositivos no administrados.
- [ ] Flujos de Power Automate creados, probados y con copropietario.
- [ ] Datos entregados al desarrollador: `tenantId`, `clientId`, hostname y ruta del sitio.
