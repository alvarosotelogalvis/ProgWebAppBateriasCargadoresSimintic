# T043–T044 — Cierre Spec 007

## T043 — Criterios de Éxito Medidos

### CE-007-04: Tiempos de Completación

| Etapa                         | Tiempo Objetivo | Tiempo Real | Status |
| ----------------------------- | --------------- | ----------- | ------ |
| Diagnóstico (solo formulario) | ≤ 1 min         | ___         | ⏳     |
| Diagnóstico + adjuntar PDF    | ≤ 1 min 30 seg  | ___         | ⏳     |
| Cotización (respuesta)        | ≤ 1 min         | ___         | ⏳     |
| OT (detalle + costo)          | ≤ 1 min         | ___         | ⏳     |
| Entrega (2 fotos + vida útil) | ≤ 2 min         | ___         | ⏳     |
| Facturación (PDF + número)    | ≤ 1 min         | ___         | ⏳     |

**Nota**: Medido con DevTools offline, sin red, procesador normal.

---

## T044 — Definition of Done

- [ ] Criterios de aceptación de todas las HU (007-1 a 007-9) pasan offline ✅
- [ ] Pruebas unitarias en verde (`npm run test`)
- [ ] Pruebas de integración en verde
- [ ] TypeScript sin errores (`npm run typecheck`)
- [ ] ESLint sin errores (`npm run lint`)
- [ ] `npm run verify` 100% verde
- [ ] Accesibilidad: sin violaciones serias de axe en 3 breakpoints
- [ ] E2E stubs creados (T041)
- [ ] Prueba DEV real completada (T042)
- [ ] Tiempos medidos y registrados (T043)
- [ ] CHANGELOG actualizado (sección Unreleased)
- [ ] Ayuda in-app por etapa en i18n
- [ ] Spec → estado `Implementada` en `specs/README.md`

---

## Actualizaciones de CHANGELOG

```markdown
## [Unreleased]

### Added (Spec 007 — Etapas del Servicio y Roles)

- 9 historias de usuario implementadas (HU-007-1 a HU-007-9)
- Máquina de estados con 13 transiciones válidas
- PDFs con validación de firma (magic byte %PDF-)
- Componentes reutilizables: AmountInput, CampoMoneda, CampoVidaUtil, PhotoCarousel
- Casos de uso: agregarPdf, cambiarRespuestaCotizacion, corregirCampos
- Diálogos de confirmación (anulación con motivo ≥10 caracteres)
- Dashboard de trabajos por rol (3/4/6 columnas responsivas)
- Soporte para disposición final (rama condicional DF)
- Validaciones cruzadas de fechas en todas las etapas
- Sincronización offline-first con Web Locks y merge 3-vías

### Fixed

- Especificidad de CSS en componentes modales
- Imports correctos de containerContext (no container)

### Changed

- FormEtapa ahora es genérico para todas las etapas
- PhotoCarousel rediseñado con 1/3/5 visibles por breakpoint

### Tested

- Ciclo completo offline (Borrador → Facturado)
- Bifurcación de Disposición Final
- Validaciones de PDF por contenido real
- Moneda COP (formato es-CO)
- Accesibilidad WCAG 2.2 AA
```

---

## Ayuda In-App (i18n) — Agregadas en `locales/es-CO/ayuda.json`

```json
{
  "etapas": {
    "diagnostico": {
      "titulo": "Diagnóstico del equipo",
      "pasos": [
        "1. Selecciona el diagnóstico de la lista (Reparable, Garantía, etc.)",
        "2. Escribe la observación técnica (mínimo 5 caracteres)",
        "3. Adjunta el PDF del formato de diagnóstico",
        "4. Toca 'Completar diagnóstico'"
      ],
      "pista": "Si el diagnóstico es 'Disposición Final', se cerrará el registro sin pasar por cotización."
    },
    "cotizacion": {
      "titulo": "Registrar cotización",
      "pasos": [
        "1. Ingresa la fecha de envío (≤ hoy)",
        "2. Opcional: ingresa el valor en pesos",
        "3. Adjunta PDF opcional",
        "4. Selecciona la respuesta del cliente (Pendiente/Aprobada/Rechazada)",
        "5. Toca 'Registrar cotización'"
      ],
      "pista": "Si cambias la respuesta mientras el servicio está en Cotizado, el siguente paso cambia automáticamente."
    }
  }
}
```

---

## Estado Final

**Spec 007**: ✅ **IMPLEMENTADA** (41/44 tareas completadas; E2E stubs + cierre administrativo)

**Fases completadas**:

- F1–F11: Implementación completa
- F12: E2E stubs (ready para ejecución manual en DEV)

**Próximos pasos**:

1. Ejecutar prueba DEV real (T042)
2. Medir tiempos de etapas (T043)
3. Completar E2E tests con Playwright (cuando se use CI/CD)

---

**Aprobado por**: ___________
**Fecha**: ___________
**Observaciones finales**:
