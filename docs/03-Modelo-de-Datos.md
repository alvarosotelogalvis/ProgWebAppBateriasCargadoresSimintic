# Modelo de Datos — Diccionario, validaciones y estructura en SharePoint

> Fuente: Excel `CARACTERES Y OPCIONES PARA CARGADORES Y BATERIAS EN INSTALACIÓN DE EMPRESA (1).xlsx` (Hoja1, encabezados en la fila 4, columnas C–U). Decisiones relacionadas: ADR-0008, ADR-0009, ADR-0012.
> Los nombres internos de SharePoint se crean **exactamente** como aparecen aquí: sin tildes, sin espacios, en PascalCase. Después se puede cambiar solo el nombre visible.

## 1. Lectura del Excel

| Col. | Encabezado original                                                                                  | Ejemplo                                                   | Interpretación                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| C    | PARA BATERIAS / CARGADORES                                                                           | —                                                         | Tipo de equipo: **Batería** o **Cargador** (mismos campos, ver PA-12)                                                     |
| E    | FECHA RECEPCIÓN                                                                                      | 2026-09-15                                                | Fecha de recepción                                                                                                        |
| F    | FOTO INGRESO                                                                                         | SUBIR JPG                                                 | Fotos del equipo al ingresar                                                                                              |
| G    | EMPRESA-CLIENTE: SIEMPRE ESCRIBIR EL MISMO, AUTOCOMPLETADO                                           | NAVAR ASOCIADOS, ARIS MINING SEGOVIA, ARIS MINING MARMATO | Cliente desde un **catálogo** con autocompletado                                                                          |
| H    | # SOLICITUD: NUMÉRICO                                                                                | 1                                                         | Número de solicitud, solo dígitos                                                                                         |
| I    | MARCA                                                                                                | ROQUET                                                    | Marca del equipo                                                                                                          |
| J    | REFERENCIA: ALFANUMÉRICA                                                                             | 48VDC450A                                                 | Referencia o modelo                                                                                                       |
| K    | # SERIE BATERÍA: ALFANUMÉRICA                                                                        | NV4520                                                    | Número de serie                                                                                                           |
| L    | DIAGNÓSTICO (cuando se da disposición final se socializa al cliente y se omiten los demás registros) | D. FINAL                                                  | Lista de valores (validación de datos `$V$7:$V$9`, **vacía en el archivo** → PA-01). La disposición final cierra el flujo |
| M    | FORMATO DIAGNÓSTICO                                                                                  | SUBIR PDF                                                 | PDF del formato de diagnóstico                                                                                            |
| N    | OBSERVACIÓN TÉCNICA                                                                                  | Observación verbal o por escrito                          | Texto largo                                                                                                               |
| O    | COTIZACIÓN                                                                                           | Se envía cotización al cliente                            | Registro del envío de la cotización (PA-02)                                                                               |
| P    | ORDEN DE TRABAJO INTERNA: ver todo lo que se necesita para la reparación; que llegue correo          | Costo reparación interna                                  | Detalle + costo; dispara un **correo**                                                                                    |
| Q    | FECHA ENTREGA                                                                                        | 2026-09-20                                                | Fecha de entrega al cliente                                                                                               |
| R    | PROYECCIÓN EXPECTATIVA DE VIDA ÚTIL: aquí colocar alertas que arroje el sistema                      | 2027-09-20                                                | Fecha proyectada. Genera **alertas**                                                                                      |
| S    | FOTO SALIDA                                                                                          | SUBIR JPG                                                 | Fotos del equipo al entregar                                                                                              |
| T    | FACTURACIÓN                                                                                          | SUBIR PDF                                                 | PDF de la factura                                                                                                         |
| U    | SI ES DISPOSICIÓN, CARGAR PDF                                                                        | SUBIR PDF                                                 | PDF de la disposición final                                                                                               |

## 2. Diccionario de datos — entidad `Servicio`

Columnas de la tabla:

- **Dominio**: nombre del campo en TypeScript (`src/domain/servicio.ts`).
- **SP**: nombre interno de la columna en la lista `Servicios`.
- **Obligatorio en**: la transición de estado que exige el campo (ver §5).

### 2.1 Identidad y sistema

| Dominio              | Tipo TS            | SP                                | Tipo SP                                               | Regla                                                                                                                                                                          |
| -------------------- | ------------------ | --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | `string` (UUID v4) | `ServicioId`                      | Una línea de texto (36), **indexada, valores únicos** | Se genera en el dispositivo al crear el borrador. Inmutable                                                                                                                    |
| `codigo`             | `string`           | `Title` (nombre visible "Código") | Una línea de texto                                    | `{BAT\|CAR}-{numeroSolicitud}-{serie}`, recalculado al cambiar esos campos. Ej.: `CAR-1-NV4520`. Mientras el número no se ha asignado usa `PEND`: `CAR-PEND-NV4520` (ADR-0024) |
| `estado`             | `EstadoServicio`   | `Estado`                          | Choice, **indexada**                                  | Ver §4. `BORRADOR` nunca se sube                                                                                                                                               |
| `capturadoPor`       | `string` (UPN)     | `CapturadoPor`                    | Una línea de texto                                    | UPN de la cuenta activa (cacheada) al crear                                                                                                                                    |
| `capturadoPorNombre` | `string`           | `CapturadoPorNombre`              | Una línea de texto                                    | Nombre visible                                                                                                                                                                 |
| `creadoEn`           | ISO datetime       | `CapturadoEn`                     | Fecha y hora                                          | Momento de creación en el dispositivo                                                                                                                                          |
| `actualizadoEn`      | ISO datetime       | `ActualizadoEnDispositivo`        | Fecha y hora                                          | Última edición local                                                                                                                                                           |
| `dispositivoId`      | `string` (UUID)    | `DispositivoId`                   | Una línea de texto                                    | UUID del dispositivo (`meta.dispositivoId`)                                                                                                                                    |
| `appVersion`         | `string`           | `AppVersion`                      | Una línea de texto                                    | Versión de la app que hizo el último push                                                                                                                                      |
| `urlCarpetaAdjuntos` | `string?`          | `UrlCarpetaAdjuntos`              | Varias líneas (texto sin formato)                     | `webUrl` de la carpeta en la biblioteca                                                                                                                                        |
| `anulacionMotivo`    | `string?`          | `MotivoAnulacion`                 | Varias líneas                                         | Obligatorio para `ANULADO`, ≥ 10 caracteres                                                                                                                                    |
| `anulacionFecha`     | ISO date?          | `FechaAnulacion`                  | Fecha                                                 | Se asigna automáticamente al anular                                                                                                                                            |

### 2.2 Recepción

| Dominio                 | Tipo TS                   | SP                                       | Tipo SP                               | Validación                                                                                                                                                                                                                                                       | Obligatorio en |
| ----------------------- | ------------------------- | ---------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `tipoEquipo`            | `'BATERIA' \| 'CARGADOR'` | `TipoEquipo`                             | Choice: `Batería`, `Cargador`         | Uno de los dos                                                                                                                                                                                                                                                   | → RECIBIDO     |
| `fechaRecepcion`        | `yyyy-MM-dd`              | `FechaRecepcion`                         | Fecha (solo fecha)                    | ≤ hoy. Por defecto hoy                                                                                                                                                                                                                                           | → RECIBIDO     |
| `clienteId`             | `number`                  | `Cliente` (escritura: `ClienteLookupId`) | Búsqueda → `Clientes.Title`           | Debe existir en el catálogo local y estar `Activo`                                                                                                                                                                                                               | → RECIBIDO     |
| `clienteNombre`         | `string`                  | — (solo local, desnormalizado)           | —                                     | Copia del `Title` del cliente, para mostrar sin conexión                                                                                                                                                                                                         | —              |
| `numeroSolicitud`       | `number` (entero)         | `NumeroSolicitud`                        | Número, 0 decimales, **indexada**     | **Lo asigna el sistema al sincronizar** (mayor existente + 1, ADR-0024). `0` = pendiente (nunca se escribe en SharePoint). No se captura ni se edita. Única por servicio; la unicidad la garantiza la verificación posterior de la app, no SharePoint (spike S9) | → RECIBIDO     |
| `marca`                 | `string`                  | `Marca`                                  | Una línea de texto (60)               | Trim, MAYÚSCULAS, 1–60 caracteres. Autocompletado desde `Marcas` + valores locales                                                                                                                                                                               | → RECIBIDO     |
| `referencia`            | `string`                  | `Referencia`                             | Una línea de texto (50)               | Trim, MAYÚSCULAS, `^[A-Z0-9][A-Z0-9\-\/\.]{0,49}$`                                                                                                                                                                                                               | → RECIBIDO     |
| `serie`                 | `string`                  | `SerieEquipo`                            | Una línea de texto (50), **indexada** | Trim, MAYÚSCULAS, `^[A-Z0-9][A-Z0-9\-\/\.]{0,49}$`                                                                                                                                                                                                               | → RECIBIDO     |
| adjuntos `FOTO_INGRESO` | `Adjunto[]`               | Biblioteca                               | JPEG                                  | `MinFotosIngreso` (1) – `MaxFotosIngreso` (5)                                                                                                                                                                                                                    | → RECIBIDO     |

> Normalización: `marca`, `referencia` y `serie` se guardan en mayúsculas sin espacios al inicio ni al final. En `referencia` y `serie` no se permiten espacios internos. La UI muestra el valor normalizado mientras el usuario escribe.

### 2.3 Diagnóstico y disposición final

| Dominio                       | Tipo TS      | SP                     | Tipo SP                                             | Validación                                            | Obligatorio en                        |
| ----------------------------- | ------------ | ---------------------- | --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| `diagnostico`                 | `string`     | `Diagnostico`          | Choice (valores administrados en SharePoint, PA-01) | Uno de los valores del catálogo `choices:Diagnostico` | → DIAGNOSTICADO / → DISPOSICION_FINAL |
| `observacionTecnica`          | `string`     | `ObservacionTecnica`   | Varias líneas, texto sin formato                    | 5–4000 caracteres                                     | → DIAGNOSTICADO / → DISPOSICION_FINAL |
| adjunto `FORMATO_DIAGNOSTICO` | `Adjunto`    | Biblioteca             | PDF                                                 | Exactamente 1 (se puede reemplazar)                   | → DIAGNOSTICADO / → DISPOSICION_FINAL |
| `fechaSocializacionDF`        | `yyyy-MM-dd` | `FechaSocializacionDF` | Fecha                                               | ≥ `fechaRecepcion`, ≤ hoy                             | → DISPOSICION_FINAL                   |
| adjunto `DISPOSICION_FINAL`   | `Adjunto`    | Biblioteca             | PDF                                                 | Exactamente 1                                         | → DISPOSICION_FINAL                   |

Disposición final = `diagnostico === config.DiagnosticoValorDisposicionFinal` (por defecto `"D. FINAL"`).

### 2.4 Cotización (PA-02)

| Dominio                | Tipo TS                                    | SP                     | Tipo SP                                      | Validación                | Obligatorio en                                                 |
| ---------------------- | ------------------------------------------ | ---------------------- | -------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `cotizacionFechaEnvio` | `yyyy-MM-dd`                               | `CotizacionFechaEnvio` | Fecha                                        | ≥ `fechaRecepcion`, ≤ hoy | → COTIZADO                                                     |
| `cotizacionValor`      | `number?`                                  | `CotizacionValor`      | Moneda (COP, 0 decimales)                    | ≥ 0                       | —                                                              |
| `cotizacionEstado`     | `'PENDIENTE' \| 'APROBADA' \| 'RECHAZADA'` | `CotizacionEstado`     | Choice: `Pendiente`, `Aprobada`, `Rechazada` | Por defecto `PENDIENTE`   | → EN_REPARACION (= APROBADA), → ENTREGADO sin OT (= RECHAZADA) |
| adjunto `COTIZACION`   | `Adjunto?`                                 | Biblioteca             | PDF                                          | 0–1                       | —                                                              |

### 2.5 Orden de trabajo interna

| Dominio             | Tipo TS  | SP                  | Tipo SP                | Validación                                                            | Obligatorio en  |
| ------------------- | -------- | ------------------- | ---------------------- | --------------------------------------------------------------------- | --------------- |
| `otDetalle`         | `string` | `OTDetalle`         | Varias líneas          | 5–4000 caracteres (repuestos, actividades, insumos)                   | → EN_REPARACION |
| `otCostoReparacion` | `number` | `OTCostoReparacion` | Moneda (COP)           | ≥ 0                                                                   | → EN_REPARACION |
| —                   | —        | `OTCorreoEnviado`   | Sí/No (por defecto No) | **Solo lo escribe Power Automate.** La app nunca lo envía en un PATCH | —               |

### 2.6 Entrega y vida útil

| Dominio                | Tipo TS      | SP                    | Tipo SP                                        | Validación                                                          | Obligatorio en                                                           |
| ---------------------- | ------------ | --------------------- | ---------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `fechaEntrega`         | `yyyy-MM-dd` | `FechaEntrega`        | Fecha                                          | ≥ `fechaRecepcion`, ≤ hoy                                           | → ENTREGADO                                                              |
| adjuntos `FOTO_SALIDA` | `Adjunto[]`  | Biblioteca            | JPEG                                           | `MinFotosSalida` (1) – `MaxFotosSalida` (10)                        | → ENTREGADO                                                              |
| `proyeccionVidaUtil`   | `yyyy-MM-dd` | `ProyeccionVidaUtil`  | Fecha, **indexada**                            | > `fechaEntrega`. Por defecto `fechaEntrega + VidaUtilMesesDefecto` | → ENTREGADO (desde EN_REPARACION). Opcional en la entrega sin reparación |
| —                      | —            | `AlertaVidaUtilNivel` | Choice: `Ninguna`, `90`, `60`, `30`, `Vencida` | **Solo lo escribe Power Automate**                                  | —                                                                        |

### 2.7 Facturación

| Dominio           | Tipo TS      | SP              | Tipo SP                 | Validación                | Obligatorio en |
| ----------------- | ------------ | --------------- | ----------------------- | ------------------------- | -------------- |
| adjunto `FACTURA` | `Adjunto`    | Biblioteca      | PDF                     | Exactamente 1             | → FACTURADO    |
| `facturaFecha`    | `yyyy-MM-dd` | `FacturaFecha`  | Fecha                   | ≥ `fechaRecepcion`, ≤ hoy | → FACTURADO    |
| `facturaNumero`   | `string?`    | `FacturaNumero` | Una línea de texto (30) | `^[A-Za-z0-9\-]{1,30}$`   | —              |

## 3. Entidad `Adjunto`

| Dominio          | Tipo TS                           | SP (biblioteca `ServiciosAdjuntos`) | Regla                                                                                      |
| ---------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`             | UUID v4                           | `AdjuntoId` (texto, indexada)       | Generado en el dispositivo                                                                 |
| `servicioId`     | UUID                              | `ServicioId` (texto, indexada)      | FK al servicio                                                                             |
| `tipo`           | `TipoAdjunto`                     | `TipoAdjunto` (Choice)              | Ver tabla de tipos                                                                         |
| `nombreArchivo`  | `string`                          | `Name` (nombre del archivo)         | Determinista, ver §3.2                                                                     |
| `mime`           | `string`                          | —                                   | `image/jpeg` o `application/pdf`                                                           |
| `tamanoBytes`    | `number`                          | `Size`                              | —                                                                                          |
| `sha256`         | `string`                          | —                                   | Evita adjuntar dos veces el mismo archivo en la misma etapa                                |
| `capturadoEn`    | ISO datetime                      | `FechaCaptura`                      | Momento de la captura o selección                                                          |
| `capturadoPor`   | UPN                               | `CapturadoPor`                      | —                                                                                          |
| `blob`           | `Blob \| null`                    | —                                   | Original optimizado. `null` cuando se purga tras sincronizar o cuando el adjunto es remoto |
| `miniatura`      | `Blob \| null`                    | —                                   | JPEG de 320 px (fotos) o ícono (PDF). Se conserva tras la purga                            |
| `sp`             | `{ driveItemId, webUrl, eTag }?`  | —                                   | Datos remotos                                                                              |
| `syncState`      | `SyncState`                       | —                                   | `pending` / `synced` / `error`                                                             |
| `eliminarRemoto` | `boolean`                         | —                                   | Marcado para borrarse en SharePoint en el próximo push                                     |
| `uploadSession`  | `{ url, expira, siguienteByte }?` | —                                   | Para reanudar subidas > 4 MB                                                               |

> **Adjuntos remotos** (creados en otro dispositivo y descubiertos en el pull, spec 006): se registran con `blob = null`, `sp` lleno, `syncState = 'synced'` y `miniatura` opcional. No necesitan un campo `origen`: un adjunto es remoto si no tiene `blob` y nunca tuvo uno local (`capturadoPor`/dispositivo distinto o sin `sha256`).

### 3.1 Tipos de adjunto

| Código (dominio)      | Valor Choice en SP  | Formato | Etapa            |
| --------------------- | ------------------- | ------- | ---------------- |
| `FOTO_INGRESO`        | Foto ingreso        | JPEG    | Recepción        |
| `FORMATO_DIAGNOSTICO` | Formato diagnóstico | PDF     | Diagnóstico      |
| `DISPOSICION_FINAL`   | Disposición final   | PDF     | Diagnóstico (DF) |
| `COTIZACION`          | Cotización          | PDF     | Cotización       |
| `FOTO_SALIDA`         | Foto salida         | JPEG    | Entrega          |
| `FACTURA`             | Factura             | PDF     | Facturación      |

### 3.2 Ruta y nombre en la biblioteca

- Carpeta: `/{yyyy de fechaRecepcion}/{ServicioId}/`. Ejemplo: `/2026/5f0c…e1/`.
- Archivo: `{codigo}_{TIPO}_{primeros 8 caracteres de AdjuntoId}.{jpg|pdf}`. Ejemplo: `CAR-1-NV4520_FOTO_INGRESO_a1b2c3d4.jpg`.
- Se sanitizan los caracteres no permitidos (`" * : < > ? / \ | # %`) reemplazándolos por `-`.
- Como el nombre es determinista y la subida usa `conflictBehavior=replace`, reintentar es idempotente.
- **Las carpetas se crean solas:** `PUT /drives/{driveId}/root:/{año}/{ServicioId}/{archivo}:/content` crea las carpetas intermedias, así que la carpeta de cada servicio no se prepara de antemano (su id nace en el dispositivo). El aprovisionador solo crea la carpeta del año (`--anios`). Comprobado el 2026-11-16 en una biblioteca real: la carpeta del servicio se crea en la primera subida, los metadatos se guardan y subir dos veces el mismo nombre deja un solo archivo.
- **Audio:** no hay adjuntos de voz (PRD PA-13: la observación técnica se dicta con el teclado). Añadirlos exigiría un tipo de adjunto nuevo, su valor en el Choice `TipoAdjunto` y un cambio de spec.

## 4. Estados (`EstadoServicio`) ↔ Choice `Estado`

| Código              | Valor en SP       | Final | Descripción                                              |
| ------------------- | ----------------- | ----- | -------------------------------------------------------- |
| `BORRADOR`          | — (no se sube)    | No    | Recepción incompleta, solo local                         |
| `RECIBIDO`          | Recibido          | No    | Pendiente de diagnóstico                                 |
| `DIAGNOSTICADO`     | Diagnosticado     | No    | Pendiente de cotización                                  |
| `COTIZADO`          | Cotizado          | No    | Cotización enviada; pendiente de respuesta, OT o entrega |
| `EN_REPARACION`     | En reparación     | No    | OT generada; pendiente de entrega                        |
| `ENTREGADO`         | Entregado         | No    | Pendiente de facturación                                 |
| `FACTURADO`         | Facturado         | Sí    | Cerrado                                                  |
| `DISPOSICION_FINAL` | Disposición final | Sí    | Cerrado sin reparación                                   |
| `ANULADO`           | Anulado           | Sí    | Anulado por un administrador                             |

Los mapeos código ↔ valor visible viven en `src/infrastructure/graph/mappers/choices.ts`. Si un valor remoto no se reconoce, se registra un error en el log y el registro se muestra como "Estado desconocido" (solo lectura).

## 5. Transiciones y campos exigidos

| Transición                                 | Rol              | Requisitos                                                                                                       |
| ------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `BORRADOR → RECIBIDO`                      | Tecnico, Admin   | Campos de §2.2 + fotos de ingreso dentro de los límites                                                          |
| `RECIBIDO → DIAGNOSTICADO`                 | Tecnico, Admin   | `diagnostico` ≠ DF, `observacionTecnica`, 1 `FORMATO_DIAGNOSTICO`                                                |
| `RECIBIDO → DISPOSICION_FINAL`             | Tecnico, Admin   | `diagnostico` = DF, `observacionTecnica`, 1 `FORMATO_DIAGNOSTICO`, `fechaSocializacionDF`, 1 `DISPOSICION_FINAL` |
| `DIAGNOSTICADO → COTIZADO`                 | Comercial, Admin | `cotizacionFechaEnvio`. `cotizacionEstado` = `PENDIENTE` si viene vacío                                          |
| (en `COTIZADO`) cambiar `cotizacionEstado` | Comercial, Admin | —                                                                                                                |
| `COTIZADO → EN_REPARACION`                 | Tecnico, Admin   | `cotizacionEstado` = `APROBADA`, `otDetalle`, `otCostoReparacion`                                                |
| `COTIZADO → ENTREGADO` (sin reparación)    | Tecnico, Admin   | `cotizacionEstado` = `RECHAZADA`, `fechaEntrega`, fotos de salida (PA-03)                                        |
| `EN_REPARACION → ENTREGADO`                | Tecnico, Admin   | `fechaEntrega`, fotos de salida, `proyeccionVidaUtil`                                                            |
| `ENTREGADO → FACTURADO`                    | Comercial, Admin | 1 `FACTURA`, `facturaFecha`                                                                                      |
| `* (no final) → ANULADO`                   | Admin            | `anulacionMotivo` ≥ 10 caracteres                                                                                |

**Reglas de edición**

- Los campos de la etapa actual son editables por los roles de la transición siguiente.
- Los campos de etapas ya completadas son de **solo lectura**, salvo para Admin (RF-26). Una corrección de Admin no cambia el estado.
- Los estados finales son de solo lectura, salvo para Admin, que puede corregir campos pero no reabrir el registro en v1.0.
- Un `BORRADOR` se puede descartar (borrado local con confirmación). Los registros ya sincronizados no se borran: se anulan.

## 6. Catálogos y configuración remota

### 6.1 Lista `Clientes`

| Columna SP          | Tipo        | Nota                                                                                                                              |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Title`             | Texto       | Nombre en MAYÚSCULAS. Ej.: `NAVAR ASOCIADOS`                                                                                      |
| `NIT`               | Texto (20)  | Opcional                                                                                                                          |
| `Activo`            | Sí/No (Sí)  | Solo los activos aparecen en el autocompletado. Un cliente fusionado queda en No                                                  |
| `CorreoContacto`    | Texto       | Opcional                                                                                                                          |
| `ClienteGuid`       | Texto (40)  | UUID generado en el dispositivo que creó el cliente. **Único e indexado**, no obligatorio (los clientes anteriores no lo tienen)  |
| `NombreNormalizado` | Texto (120) | Nombre en mayúsculas, sin tildes y con espacios colapsados. **Único e indexado**: evita duplicados creados desde dos dispositivos |
| `FusionadoConId`    | Número      | Si el cliente se fusionó en otro, el ID del destino (el origen se conserva como historial, con `Activo = No`)                     |
| `CreadoDesdeApp`    | Sí/No (No)  | Sí si lo creó un usuario desde el formulario                                                                                      |

Datos iniciales: `NAVAR ASOCIADOS`, `ARIS MINING SEGOVIA`, `ARIS MINING MARMATO`.

**Clientes creados desde la app y fusión (ADR-0023, spec 010).** El técnico puede escribir un cliente nuevo al registrar un servicio, también sin conexión: queda en el dispositivo con un id temporal negativo derivado de su `ClienteGuid` y se crea en SharePoint **antes** de subir los servicios que lo usan. Si el `ClienteGuid` o el `NombreNormalizado` ya existen, SharePoint los rechaza (valor único; en columnas de texto es inmediato, spike S10) y la app adopta el cliente existente. Solo se suben los clientes que algún servicio usa. Un Administrador puede **fusionar** dos clientes: se reasignan los servicios del origen al destino y el origen se deja `Activo = No` con `FusionadoConId` (nunca se borra). La fusión se registra en `LogSincronizacion.Detalle`. Para poder filtrar `Servicios` por cliente, la columna `Servicios.Cliente` está **indexada**.

### 6.2 Lista `Marcas`

| `Title` (MAYÚSCULAS) | `Activo` (Sí/No) |

Dato inicial: `ROQUET`.

### 6.3 Lista `ConfiguracionApp` (clave/valor)

| `Title` (clave)                       | `Valor` (texto)               | Por defecto en la app | Uso                                                                 |
| ------------------------------------- | ----------------------------- | --------------------- | ------------------------------------------------------------------- |
| `VersionMinimaApp`                    | SemVer                        | `1.0.0`               | Bloquea la sincronización en versiones menores                      |
| `SyncModoAutenticacion`               | `confirmar` \| `reautenticar` | `confirmar`           | `reautenticar` = login interactivo en cada sincronización           |
| `SyncReautenticacionHoras`            | entero                        | `12`                  | Horas máximas desde el último login interactivo en modo `confirmar` |
| `MinFotosIngreso` / `MaxFotosIngreso` | entero                        | `1` / `5`             | —                                                                   |
| `MinFotosSalida` / `MaxFotosSalida`   | entero                        | `1` / `10`            | —                                                                   |
| `MaxTamanoPdfMB`                      | entero                        | `20`                  | —                                                                   |
| `ImagenMaxLadoPx`                     | entero                        | `1920`                | —                                                                   |
| `ImagenCalidad`                       | decimal                       | `0.75`                | —                                                                   |
| `VidaUtilMesesDefecto`                | entero                        | `12`                  | Sugerencia de la proyección de vida útil                            |
| `UmbralesAlertaDias`                  | CSV                           | `90,60,30`            | Alertas en la app y en el flujo                                     |
| `RetencionCerradosMeses`              | entero                        | `3`                   | Servicios cerrados que se conservan localmente                      |
| `RetencionOriginalesDias`             | entero                        | `7`                   | Días que se conserva el archivo original ya sincronizado            |
| `DescargarMiniaturasRemotas`          | `true`/`false`                | `true`                | Solo para servicios abiertos                                        |
| `DiagnosticoValorDisposicionFinal`    | texto                         | `D. FINAL`            | Valor de `Diagnostico` que significa DF                             |
| `RecordatorioPendientesHoras`         | entero                        | `24`                  | Aviso de pendientes antiguos                                        |
| `CorreoDestinoOT`                     | correo(s) separados por `;`   | —                     | Lo usa Power Automate                                               |
| `CorreoDestinoAlertas`                | correo(s) separados por `;`   | —                     | Lo usa Power Automate                                               |

La app valida cada valor con zod. Si un valor es inválido, se usa el valor por defecto y se registra una advertencia.

### 6.4 Lista `LogSincronizacion`

| Columna                                                                        | Tipo                             | Contenido                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------- |
| `Title`                                                                        | Texto                            | `correlationId` (UUID) de la ejecución                                      |
| `Usuario`                                                                      | Texto                            | UPN                                                                         |
| `Dispositivo`                                                                  | Texto                            | `dispositivoId` + plataforma (ej. `Android/Chrome 140`)                     |
| `AppVersion`                                                                   | Texto                            | —                                                                           |
| `Inicio` / `Fin`                                                               | Fecha y hora                     | —                                                                           |
| `Resultado`                                                                    | Choice: `OK`, `Parcial`, `Error` | —                                                                           |
| `ServiciosSubidos` / `ArchivosSubidos` / `ServiciosDescargados` / `Conflictos` | Número                           | —                                                                           |
| `Errores`                                                                      | Varias líneas                    | JSON resumido (máx. 4000 caracteres, sin datos personales más allá del UPN) |

## 7. Configuración de las listas y la biblioteca en SharePoint

- **Versionado**: activado en `Servicios` (50 versiones principales) y en `ServiciosAdjuntos` (50 versiones principales).
- **Índices** en `Servicios`: `ServicioId` (único), `Estado`, `SerieEquipo`, `NumeroSolicitud`, `ProyeccionVidaUtil`, `Modified`.
- **Índices** en `ServiciosAdjuntos`: `ServicioId`, `AdjuntoId`.
- **Datos adjuntos de la lista `Servicios`**: desactivados (los archivos van a la biblioteca).
- **Vistas sugeridas** en `Servicios`, para reportes sin app: _Abiertos por estado_ (agrupada por `Estado`), _Por cliente_, _Vida útil próxima_ (`ProyeccionVidaUtil` ≤ [Hoy]+90), _Pendientes de facturar_ (`Estado` = Entregado), _Disposiciones finales_.
- **Permisos**: grupo de SharePoint "ServicioTecnico-Usuarios" con nivel _Colaborar_ (Contribute) en las listas `Servicios`, `LogSincronizacion` y la biblioteca. _Lectura_ en `Clientes`, `Marcas` y `ConfiguracionApp`. Los administradores tienen _Control total_.

## 8. Datos locales que no van a SharePoint

| Tabla Dexie    | Contenido                                                                                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta`         | `dispositivoId`, `siteId`, `listIds`, `driveId`, `deltaLinkServicios`, `metodoPull` (`delta` \| `filtro`), `ultimaSyncEn`, `ultimoCorrelationId`, `configuracionInicialCompleta`, `ultimoLoginInteractivoEn`, `ultimaCuenta`, `almacenamientoPersistente`, `versionEsquema` |
| `catalogos`    | `clientes`, `marcas`, `choices:Diagnostico`, `choices:Estado`, `config` (ConfiguracionApp ya resuelta), con `actualizadoEn`                                                                                                                                                 |
| `logs`         | Anillo de 2000 entradas (ver SDD §15)                                                                                                                                                                                                                                       |
| `preferencias` | Tamaño de fuente, tema, último filtro (también puede vivir en `localStorage`)                                                                                                                                                                                               |

El esquema Dexie completo está en `02-SDD.md` §6.
