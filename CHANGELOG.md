# Changelog

Todas las novedades relevantes de esta proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto
adopta [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

- Andamiaje del proyecto: TypeScript estricto, React 19, Vite, PWA instalable, ESLint con reglas
  de capas, Stylelint, Husky, Vitest y Playwright.
- Dominio del servicio: modelo de datos, estados y transiciones con roles y requisitos,
  normalización, validaciones por etapa, código legible, alertas de vida útil y merge a tres vías.
- Persistencia local con Dexie: servicios, adjuntos, catálogos, metadatos y logs; repositorios,
  unidad de trabajo transaccional, migración v1 y hooks reactivos.
- Casos de uso de servicios (`crearBorrador`, `actualizarCampos`, `completarEtapa`, `anular`,
  `descartarBorrador`), contenedor de dependencias y logger local con captura global de errores.
- Pruebas de dominio, persistencia, atomicidad, migración, hooks y casos de uso (168 pruebas).
- Script `npm run coverage` con umbrales de cobertura para `domain/` y `application/`.

### Cambiado

### Corregido

### Eliminado
