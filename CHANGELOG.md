# Changelog

Todas las novedades relevantes de esta proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto
adopta [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added (spec 010 — clientes nuevos y fusión, ADR-0023)

- **Agregar un cliente nuevo desde el formulario**, también sin conexión: se escribe y queda como un cliente más (sin «provisional»). Si el nombre ya existe —ignorando tildes, mayúsculas y espacios— la app propone usar ese. Los clientes nuevos se crean en SharePoint **antes** de subir los servicios que los usan, de forma idempotente (`ClienteGuid` y `NombreNormalizado` únicos); dos dispositivos que crean el mismo cliente terminan con uno solo. Solo se suben los clientes que algún servicio usa.
- **Fusión de clientes** (menú técnico → Clientes, solo Administrador y con conexión): reasigna los servicios del cliente que se fusiona al que se conserva; el origen queda `Activo = No` con `FusionadoConId` y no se borra. Es reanudable, queda en `LogSincronizacion.Detalle` y los dispositivos pasan al cliente vigente los servicios pendientes que apuntaban al fusionado.
- Los clientes pendientes viven en una clave propia que el refresco del catálogo no toca, y entran en el respaldo (`clientesNuevos.json`).
- Columnas nuevas en SharePoint: `Clientes` (`ClienteGuid`, `NombreNormalizado`, `FusionadoConId`, `CreadoDesdeApp`), `LogSincronizacion.Detalle` y `Servicios.Cliente` indexada. El aprovisionamiento las crea/corrige y rellena `NombreNormalizado` de los clientes existentes. El grupo de técnicos pasa a _Colaborar_ en `Clientes`.
- Spike S10 (`docs/spikes/S10-clientes.md`) y pruebas en vivo con dos dispositivos creando el mismo cliente y fusionando 10 servicios con un corte.

### Fixed

- Un cliente creado sin red (id temporal negativo) hacía fallar «Completar recepción» con «Selecciona el cliente»: la validación solo aceptaba ids positivos.

### Performance

- **Bundle**: la carga inicial baja a ~266 KB comprimidos (límite RNF-06: 350 KB). Se quitaron 38 iconos que ninguna pantalla usaba (venían de las pantallas de referencia de diseño; −9,4 KB) y el panel de filtros de la lista de servicios se carga solo al abrirlo con `React.lazy` (−62 KB en la primera visita a la lista: de 340 a 278 KB). El peor caso real queda en el formulario de recepción (339 KB).
- **`npm run bundle:medir`** (`scripts/medir-bundle.mjs`): mide la carga inicial y la primera visita a cada pantalla (entrada + trozos bajo demanda + CSS, gzip, sin fuentes) y falla si algo supera los 350 KB.

### Changed

- **Número de solicitud automático** (spec 011, ADR-0024): el formulario ya no lo pide. Al sincronizar la app lee el mayor número en SharePoint y asigna el siguiente (uno por equipo); mientras tanto el servicio muestra «Pendiente» y su código usa `PEND` (`BAT-PEND-NV4520`). Reemplaza la decisión PA-07 del PRD.
- **Verificación posterior de la numeración**: como la unicidad de SharePoint llega tarde y no es fiable (spike S9), tras crear el ítem la app comprueba si otro tiene el mismo número y, si lo tiene, el de menor id conserva el número y el otro se renumera. Probado contra SharePoint real con dos dispositivos a la vez.
- `NumeroSolicitud` ya no se puede editar ni corregir desde la app; el buscador no indexa el «0» de pendiente; el aviso de duplicados compara por serie.
- El script de aprovisionamiento ahora corrige con PATCH una columna existente sin índice (`NumeroSolicitud`).

### Removed

- Textos i18n sin uso (`config.json`, «proximamente») y los campos `editor`/`editorNombre` del cambio remoto: el delta de SharePoint no trae `lastModifiedBy`, así que nunca se llenaban ni se mostraban.

### Added

- Prueba que fija que un servicio `ENTREGADO` sin facturar nunca se purga (es estado abierto: el pull lo volvería a descargar y sigue pendiente de factura; PA-03).
- **Prueba en vivo de sincronización** (`npm run test:live`, `tests/live/`): ejecuta el motor, los mapeadores, el cargador y el gateway reales contra un SharePoint real con 3 «dispositivos» (subida con 2 fotos y 1 PDF, descarga con miniaturas, edición con `If-Match`, campo vaciado, conflicto 412 resuelto, idempotencia, eliminación remota) y borra todo lo que crea. Es opcional: exige `LIVE_CONFIRMAR=SI`, `LIVE_SITE_URL` y `LIVE_ENV_FILE`, y nunca corre con `npm test`.
- **Prueba de rendimiento con el volumen esperado** (`tests/e2e/rendimiento-volumen.spec.ts`): lista, búsqueda y detalle con 50 y 100 servicios, también con la CPU frenada 4×, con presupuestos holgados.
- **Carpetas de año en `ServiciosAdjuntos`** con `provision-sharepoint-graph.mjs --anios`, y comprobación en una biblioteca real de que la carpeta `/{año}/{ServicioId}` se crea sola al subir el primer archivo.
- **`scripts/provision-sharepoint-graph.mjs`:** aprovisiona por Microsoft Graph (aplicación + secreto, sin inicio de
  sesión interactivo) las listas, columnas, índices, datos iniciales y claves de configuración. Ensayo por defecto,
  idempotente, nunca borra. Verificado contra un sitio real. Esquema en `scripts/esquema-sharepoint.mjs`.
- **`scripts/provision-sharepoint.ps1` (spec 004, T004).** Aprovisiona en SharePoint las 5 listas y la biblioteca
  con columnas de nombre interno exacto, `ServicioId` único, índices, versionado, vistas, datos iniciales,
  claves de `ConfiguracionApp` y permisos; idempotente y con `-WhatIf`. Probado con un SharePoint simulado
  (`npm run test:ps-provision`) y con una prueba que lo mantiene sincronizado con la app; sin ejecutar aún
  contra un tenant real.
- **Medición de Lighthouse y del bundle (F10.2)** registrada en `docs/F10-RENDIMIENTO-Y-RELEASE.md`: accesibilidad y
  buenas prácticas en 100; rendimiento 98–99 con la app ya cargada y 82–83 en la primera carga en frío; bundle
  inicial de 333 KB gzip (límite 350). Incluye diagnóstico, composición del bundle y opciones.
- **Guías de los spikes S1–S7 y plantilla de la matriz de dispositivos.** `docs/spikes/` (índice y una guía por
  spike con pasos, tablas de resultado y decisión) y `docs/pruebas/matriz-PLANTILLA.md` (M-01…M-14 con
  procedimiento y criterio). El registro `adjunto.agregado` incluye ahora `procesadoMs` y el peso antes y
  después para medir la compresión de fotos desde el menú técnico (spike S6, CE-003-04).
- **Cierre de la spec 001 (fundación).** Pruebas de botones, campos, `ResponsiveNav`, `ResponsiveDialog`,
  guards, `AvisoActualizacion`, `AjustesPage`, `Avatar`/`DecoCircle`, instalación y `ErrorRuta`; E2E de
  instalación, shell sin conexión, navegación, actualización con dos builds y accesibilidad (11 rutas +
  desbordamiento de 320 a 1920 px); `check:build-mock` dentro de `npm run verify`. Componentes `Avatar` y
  `DecoCircle`, y pantalla `ErrorRuta` (error y 404 en español dentro del shell).

### Fixed

- **CSP:** `connect-src` permite `https://*.svc.ms`, el host de las miniaturas remotas de SharePoint (comprobado en vivo; CORS `*`). Prueba nueva en `cabeceras.test.ts`.
- **Las eliminaciones hechas en SharePoint no llegaban a los dispositivos:** el `delta` de listas marca el borrado
  con `deleted` y no con `@removed`; la entrada se ignoraba. Ahora se reconocen ambas formas.
- **Un servicio descargado por `delta` no se podía enviar después (409):** el eTag del `delta` llega sin comillas y
  SharePoint responde 409 a un `If-Match` sin comillas aunque esté vigente. Se normaliza siempre a la forma con comillas.
  Ambos defectos se encontraron al ejecutar los spikes S3 y S4 contra SharePoint real; el emulador de pruebas
  ahora se comporta como SharePoint real en estos puntos.
- **Texto de ayuda de la observación técnica:** decía «Puedes grabar audio», pero la app no graba audio (PA-13: se dicta con el teclado). Ahora indica el dictado por teclado.
- **El motor no reconocía el duplicado de `ServicioId` en SharePoint real:** SharePoint responde 400
  `invalidRequest` («unique constraints…»), no 409, así que la idempotencia ante una carrera de reintento
  habría fallado. Ahora se reconoce por el mensaje (`esValorUnicoDuplicado`) y el emulador de pruebas responde igual.
- **`.env.production.example` traía `VITE_APP_ENV=prod`, valor que el esquema rechaza (`dev` o `prd`):** quien
  copiara la plantilla tal cual vería la pantalla de error de configuración en producción. Se corrige y una
  prueba valida que las plantillas de entorno usen valores aceptados.
- **La CSP de producción bloqueaba dos cosas en cada carga (spike S8):** zod 4 probaba `new Function` (eval) y
  React Aria inyectaba un `<style>` en línea. Se desactiva el JIT de zod y la regla de React Aria se sirve como
  archivo con el `id` que la librería reconoce; la CSP no cambia (sin `unsafe-inline`). Nuevo E2E
  `tests/e2e/csp.spec.ts` que sirve el build con las cabeceras reales y falla ante cualquier violación.
- **E2E que no probaban nada o fallaban según el día/equipo:** `performance-tecnico` (esqueletos con el puerto
  5173 fijo) y `respaldo.spec` (sin configuración inicial, con aserciones envueltas en `if`) se reescribieron con
  datos sembrados en IndexedDB y comprobaciones reales (ZIP, importación sin duplicar, purgas que respetan lo
  pendiente). Las capturas visuales fijan la fecha de inicio del reloj y la pantalla de configuración fija la
  cuota de almacenamiento; se regeneraron esas imágenes de referencia.
- **El tamaño de fuente elegido se perdía al recargar:** `aplicarEscalaGuardada()` nunca se llamaba al arrancar.
- **La actualización de la app no se aplicaba:** el service worker nuevo quedaba en espera tras recargar; ahora
  se le pide `SKIP_WAITING` y se recarga al tomar el control (ES-001-20).
- **Actualización durante trabajo en curso:** nada bloqueaba la actualización; ahora los formularios con
  cambios sin guardar y la sincronización en curso la posponen (FR-001-11, ES-001-19).
- **Instalación en iOS:** ya no aparece «Continuar sin instalar» (ES-001-02); en iPhone con otro navegador se
  pide abrir Safari (ES-001-03); en escritorio hay un banner descartable que recomienda instalar (ES-001-04).
- **Área táctil de 44 px** en botones compactos y pastillas (`::before` invisible, RNF-08).
- **Accesibilidad:** `DateChip` sin `id` dejaba el campo sin etiqueta asociada; `<dl>` inválido en el menú técnico.

- **Regla de capas con `eslint-plugin-boundaries` (ADR-0004, T007).** `domain` solo importa `domain`;
  `application` solo `domain` y puertos; `shared` no importa `application` ni `features`; además `domain` y
  `application` no importan React, Dexie ni MSAL ni usan `fetch`. Sin excepciones: los casos de uso de purgas,
  restablecer, reintentar errores, respaldo y adjuntos (hash) dependen ahora de puertos nuevos
  (`ContenidoArchivoPort`, `ZipPort`, `BorradoLocalPort`, `AdjuntoRepository.listarTodos`) con adaptadores en
  `infrastructure/`. Se añade `eslint-import-resolver-typescript` (solo desarrollo).
- **Borrado remoto de campos también en el 412.** Al combinar tras un choque de versión al subir, el resolutor
  aplica los campos que SharePoint vació con las mismas reglas que la descarga. Si el campo vaciado es un dato
  mínimo del estado actual, queda en conflicto de estado para que lo revise el usuario.
- **Borrado remoto de campos al descargar.** Si alguien vacía un campo en SharePoint (p. ej. el número de
  factura), el dispositivo lo quita al descargar. Se infiere solo de ítems completos y nunca para campos
  obligatorios. Si el campo tiene un cambio local pendiente: sin conflicto cuando SharePoint nunca lo tuvo
  o ambos lo vaciaron; conflicto si se editó localmente y SharePoint lo vació.
- **«Reintentar errores» en el menú técnico (ES-009-16).** Devuelve a la cola todos los servicios en
  error (intentos a 0, sin espera) y avisa cuántos quedaron; no toca conflictos ni sincroniza por sí solo.
  El caso de uso previo solo borraba el mensaje de error y dejaba el servicio en `error`.
- **Menú técnico operativo (spec 009).** La ruta `/tecnico` mostraba «Próximamente»: ahora abre el
  diagnóstico del dispositivo y de SharePoint, el visor de registros, el respaldo, «Liberar espacio» y
  «Restablecer la app» (pide escribir BORRAR).
  - Respaldo real: un ZIP estándar (`fflate`) con los servicios completos, los metadatos de los
    adjuntos y sus fotos y PDF. Importar valida todo antes de escribir, guarda en una sola
    transacción, omite los servicios que ya existen y nunca sobrescribe. «Solo pendientes» incluye
    borradores, con error y en conflicto. Antes exportaba un resumen de 4 campos en un JSON y la
    importación no guardaba nada.
  - Restablecer se niega si hay cualquier servicio o adjunto sin sincronizar (antes solo miraba
    «pendiente»).

- **Spec 006: Sincronización de descarga y conflictos.** Después de subir, la sincronización descarga
  lo que otros dispositivos crearon o cambiaron en SharePoint y refresca catálogos y configuración.
  - Descarga incremental por delta de la lista (paginada, con recuperación si el `deltaLink`
    caduca); los cerrados solo dentro de la retención. El punto de continuación avanza solo cuando
    todos los cambios quedaron aplicados, así que repetir la descarga es seguro.
  - Combinación por campo (`mergeTresVias`) con la regla del estado más avanzado. Un servicio con
    cambios pendientes nunca se sobrescribe ni se borra; si SharePoint lo eliminó y hay cambios
    locales, queda en conflicto.
  - Un 412 al subir se resuelve leyendo el ítem remoto: sin choque se reintenta una vez con el eTag
    nuevo; con choque queda «En conflicto» y no se sube ese campo.
  - Pantalla «Resolver conflicto» (tarjetas en compacto, tabla en expandido), aviso en el detalle y
    pestaña «Conflictos» en Sincronización; elegir «Mi valor» o «SharePoint» por campo.
  - Adjuntos de SharePoint en el detalle (con conexión): fotos con miniatura (hasta 50 por
    sincronización, no con el almacenamiento al 80 % o más ni con la opción desactivada) y
    documentos con «Abrir en SharePoint» (sin conexión, deshabilitado y explicado).
  - Emulador de Graph con delta, eliminaciones, carpetas y miniaturas; pruebas de integración de
    punta a punta con dos dispositivos.

- **Spec 007: Etapas del servicio y roles.** Cada etapa guarda sus datos y avanza el estado por los
  casos de uso: diagnóstico (con rama de disposición final y confirmación), cotización con respuesta
  del cliente, orden de trabajo, entrega (con y sin reparación), facturación y anulación con motivo.
  - El detalle ofrece la siguiente etapa según estado y rol, muestra las fotos de salida, un resumen
    por etapa y «Pendiente de <rol>» en la línea de tiempo.
  - Adjuntar, reemplazar y eliminar PDF validados por contenido (`agregarPdf`, `CampoPdf`).
  - Administrador: «Editar datos» para corregir etapas ya registradas sin cambiar el estado
    (rechaza fechas incoherentes) y anulación con motivo de al menos 10 caracteres.
  - Inicio: «Mis trabajos» con contador por rol y filtro en la lista de servicios.
  - Ayuda in-app: temas de etapas y roles, adjuntar PDF y corregir o anular.
  - Pruebas: unitarias, de integración (ciclo completo Recibido → Facturado) y E2E del ciclo,
    la disposición final, la entrega sin reparación, la anulación y las correcciones.

- **Spec 009: Soporte técnico, respaldo y purgas** (Fase F9)
  - Respaldo manual (exportar/importar) con Web Share API y fallback a descarga
  - Limpieza automática segura de espacio (purgas transaccionales, nunca toca pendientes)
  - Integración de purgas en SyncEngine al finalizar sincronización exitosa
  - Diagnóstico para soporte: estado del dispositivo, SharePoint, visor de logs
  - Acciones de mantenimiento: reintentar errores, refrescar catálogos, restablecer app
  - Menú técnico con visualización adaptativa por rol y breakpoint
  - 30+ tareas, 7 fases, 100+ pruebas unitarias/integración/E2E

### Fixed

- El arranque descarga MSAL bajo demanda (chunk aparte de 64 KB gzip): el bundle inicial baja de 333 a
  269 KB gzip y en modo `mock` MSAL no se descarga. Un arranque normal ya no espera a MSAL para el
  primer render; si la URL trae la respuesta del login, se resuelve antes de pintar, como antes.
- La PWA no se podía instalar: faltaban los íconos que referencia el manifest (`public/icons/`).
  Se agregaron los provisionales y una pantalla de arranque estática que se ve antes de cargar el JS.
- Una trampa de configuración: el build de producción también falla ahora si faltan o son
  placeholders el cliente/tenant de Entra ID y el sitio de SharePoint (`.env.production.example`).
- Los registros no deben contener credenciales en URLs: se redactan `token`, `sig`, `tempauth`, etc.
- Los servicios cerrados nunca se purgaban (la purga leía un campo inexistente): ahora se usa la
  última modificación y se borran también sus adjuntos (antes quedaban huérfanos). Se eliminó la
  segunda implementación de purgas, que nadie usaba.
- Vaciar un campo (p. ej. el número de factura al corregir) ahora se sincroniza como `null` en
  SharePoint; antes el campo quedaba «sucio» para siempre y el servicio pendiente en cada sincronización.
- `public/_headers` bloqueaba toda llamada a Graph y a Microsoft Entra en producción (`connect-src 'self'`):
  ahora coincide con el SDD §14.2 (Graph, Entra ID y SharePoint para miniaturas).
- Los mensajes de validación ausentes salían en inglés (API de Zod 3 con Zod 4): ahora son claves
  de traducción también cuando el campo falta.
- Alertas de vida útil: la fecha se trata como texto `yyyy-MM-dd` (antes se desplazaba un día por la
  zona horaria), los textos pasaron a i18n y los niveles conservan su nombre con umbrales distintos.
- Respaldo: el paquete exportado perdía los archivos (`_archivos` era un arreglo) y la estimación de
  tamaño tenía un error de redondeo.
- Pantalla técnica: ids de lista y biblioteca de SharePoint mostraban vacío; el almacenamiento del
  dispositivo siempre mostraba 0 en navegadores reales («Illegal invocation»); faltaban 14 claves
  de traducción; las etiquetas del visor de logs no estaban asociadas a sus campos.
- El namespace i18n `etapas` no estaba registrado y las pantallas de etapa mostraban claves crudas.
- Las pantallas de etapa leían los catálogos con un índice inexistente (`where('id')`).
- Crear un servicio sin sesión activa dejaba la pantalla en «Creando servicio…» sin mensaje.
- `npm run typecheck` y `npm run build:dev` vuelven a funcionar (130 errores de tipos previos) y se
  rehicieron las pruebas de transiciones, campos editables y esquemas, que nunca se ejecutaban.

## [Unreleased - Previous]

### Añadido

- **Etapas del servicio y roles (spec 007)**: 9 historias de usuario completas (diagnóstico, cotización,
  orden de trabajo, entrega, facturación, anulación, disposición final, PDFs validados, trabajos por rol).
  Máquina de estados con 13 transiciones, validaciones cruzadas de fechas, rama condicional DF sin OT,
  componentes de moneda COP y vida útil sugerida, diálogos de confirmación, dashboard de trabajos.
  Offline-first comprobado en ciclo Borrador → Facturado.

- Sincronización (spec 005): progreso por servicio y archivo con cancelación ordenada, cola con
  % sincronizado y segmentos En cola · Con error · Conflictos, mensajes de error por código,
  acción "Reintentar" (reinicia los intentos) y resumen al terminar o si otra ventana ya sincroniza.

- Componentes del sistema de diseño: `BarList`, `DonutProgress` y `Chip`.
- Recordatorios de sincronización: contador de pendientes siempre al día en la barra superior,
  badge en "Sincronizar" (navegación e Inicio), aviso "¿Sincronizar ahora?" al volver la conexión
  (máx. 1 cada 30 min, nunca sincroniza solo) y recordatorio en Inicio de pendientes antiguos.

- Bloqueo de la sincronización por `VersionMinimaApp` con el botón "Buscar actualización"; la
  configuración remota se vuelve a leer antes de cada sincronización (si falla, se usa la copia
  local).

- E2E `sync-online.spec.ts` (sin conexión → recepciones → aviso → sincronizar → resumen, con axe
  en 360/768/1280 px) y capturas visuales de la pantalla de sincronización.

- Prueba que verifica que toda clave literal de `t()` exista en `src/locales/es-CO`.

### Cambiado

- ADR-0006 (roles de app y ventana de 12 h) y ADR-0007 (`Sites.Selected`) pasan a Aceptado tras la
  verificación en DEV. Specs 004 y 005 implementadas (iOS de la 004 pendiente de verificar).
- `RetencionCerradosMeses` por defecto pasa de 6 a 3 meses (aclaración de la spec 006).

### Corregido

- Tildes en todos los textos de la interfaz (más de 110 textos) y textos fijos en componentes
  pasados a i18n (lista de servicios, galería, navegación, diálogos, avisos, "Sin permiso").
- El namespace de `common.json` se registraba como `comun`: los textos comunes (p. ej. "Cargando…")
  se mostraban como clave. Faltaba también la clave `detalle.noEncontrado`.
- La barra superior mostraba "Inicio" en todas las pantallas; ahora muestra la sección actual.
- Inicio mostraba las claves `vacio.titulo` y `vacio.descripcion` en lugar del texto.
- El tamaño de lo pendiente mostraba "0 MB" con archivos pequeños; ahora usa KB.
- La lista "Se subirán" no tenía un orden estable; ahora sigue el orden de la cola del motor.
- La app ignoraba la configuración descargada de SharePoint (`ConfiguracionApp`) y usaba siempre
  los valores por defecto, lo que bloqueaba la sincronización por versión mínima.
- Bitácora de sincronización: `Inicio` registraba la hora de fin y `Errores` podía quedar como JSON
  inválido al recortarse a 4000 caracteres.
- Modo demo (`VITE_AUTH_MODE=mock`): "Confirmar" no sincronizaba porque la cuenta simulada no
  registraba la hora del login.
- Plurales de i18n en `sync.json` (formato `_one`/`_other` de i18next 23).
- Tokens CSS inexistentes (`--text-title`, `--peso-medium`) en la pantalla de sincronización.

- Recepción offline (spec 003): formulario con autoguardado, validación y catálogos de cliente/marca,
  detección de serie duplicada, lista filtrable y pantalla de detalle.
- Adjuntos de ingreso: puertos `ImageProcessor` y `StoragePort`, procesamiento de imágenes en
  `Canvas` con miniatura, hash SHA-256 para deduplicar, agregar/eliminar fotos y galería.
- Componentes del sistema de diseño: `ComboboxField`, `DateChip`, `PillInput` y `PhotoGallery`.
- Andamiaje del proyecto: TypeScript estricto, React 19, Vite, PWA instalable, ESLint con reglas
  de capas, Stylelint, Husky, Vitest y Playwright.
- Dominio del servicio: modelo de datos, estados y transiciones con roles y requisitos,
  normalización, validaciones por etapa, código legible, alertas de vida útil y merge a tres vías.
- Persistencia local con Dexie: servicios, adjuntos, catálogos, metadatos y logs; repositorios,
  unidad de trabajo transaccional, migración v1 y hooks reactivos.
- Casos de uso de servicios (`crearBorrador`, `actualizarCampos`, `completarEtapa`, `anular`,
  `descartarBorrador`), contenedor de dependencias y logger local con captura global de errores.
- Pruebas de dominio, persistencia, atomicidad, migración, hooks y casos de uso.
- Línea de tiempo de etapas en el detalle del servicio y galería de fotos de ingreso.
- Filtros de servicios por estado, tipo, cliente y rango de fechas, con buscador diferido.
- Captura de fotos desde cámara, galería, archivos y webcam, visor con navegación y eliminación.
- Pruebas E2E de recepción offline, procesamiento de imágenes, accesibilidad (axe) y capturas
  visuales en 360, 768 y 1280 px comparadas contra línea base.
- Script `npm run coverage` con umbrales de cobertura para `domain/` y `application/`.
- Autenticación con Entra ID (spec 004): MSAL SPA + PKCE, validación de tenant y roles,
  cuenta recordada sin conexión y modo de autenticación simulado para pruebas.
- Configuración inicial guiada: bienvenida, inicio de sesión, descarga de catálogos y
  configuración, reserva de almacenamiento y repetición desde Más sin borrar datos.
- Mi cuenta, cambio de cuenta y cierre de sesión con advertencia de pendientes; permisos por rol.
- Fundamentos de sincronización push (spec 005, en curso): clasificación de errores y backoff,
  rutas y nombres de archivo deterministas, mapper de SharePoint con Choice y fechas,
  subida simple y sesiones, Web Locks y persistencia de la intención de login.

### Cambiado

- Tokens de estado pendiente, cotizado y advertencia ajustados a AA (#8A5200).
- Claves de CSS Modules con guiones migradas a camelCase para que los estilos se apliquen en el build.

### Corregido

- Estilos de navegación, botones, tarjetas, avisos y campos que no se aplicaban por claves de
  CSS Modules con guiones.
- VisorImagen y diálogos accesibles: aria-label en el Dialog de React Aria.
- imageProcessor libera el object URL después de dibujar y reintenta createImageBitmap sin opciones.
- Filtrado del ComboboxField sin distinguir tildes y selección por id de la opción.
- Traducción de errores de dominio en FormRecepcion y namespace errores registrado en i18n.
- `TextField`, `ComboboxField` y `SelectField` usan `Label` y los controles de `react-aria-components`,
  corrigiendo la asociación accesible y la propagación de cambios en los campos de texto.

### Eliminado
