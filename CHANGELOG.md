# Changelog

Todas las novedades relevantes de esta proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto
adopta [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

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
