# Changelog

Todas las novedades relevantes de esta proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto
adopta [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

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
