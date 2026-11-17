# ADR-0009 — Modelo remoto en SharePoint: listas + biblioteca vía Microsoft Graph

- **Estado**: Aceptado (SharePoint como destino) · Propuesto (estructura detallada)
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (subir a SharePoint del tenant); estructura propuesta por Claude
- **Origen en la guía**: `01-Comun` §4, doc. base §9.1 (SharePoint / Dataverse, listas, restricciones de integridad, backups)

## Contexto

SharePoint es la fuente oficial: consulta, reportes, Power Automate y respaldo de M365. Se necesitan integridad (no duplicar), archivos con metadatos, catálogos administrables y configuración ajustable sin redesplegar.

## Opciones consideradas

1. **Una lista con datos adjuntos de lista**. Contras: Graph no gestiona bien los adjuntos de ítems de lista (soporte limitado), sin metadatos por archivo ni subida reanudable.
2. **Lista `Servicios` + biblioteca `ServiciosAdjuntos` (carpeta por servicio) + listas de catálogo y configuración**. Pros: subida reanudable (upload sessions), metadatos por archivo, versionado, vistas y flujos.
3. **Dataverse**. Contras: licencias premium y no es lo pedido.

## Decisión

Estructura de `docs/03-Modelo-de-Datos.md` §2–§7:

- Lista **`Servicios`** (un ítem por equipo, `ServicioId` **único**, columnas con nombres internos exactos, índices y versionado).
- Biblioteca **`ServiciosAdjuntos`** con carpetas `/{año}/{ServicioId}/` y columnas `ServicioId`, `AdjuntoId` y `TipoAdjunto`.
- Listas **`Clientes`** y **`Marcas`** (catálogos), **`ConfiguracionApp`** (clave/valor) y **`LogSincronizacion`**.
- Valores de catálogo como **columnas Choice** leídas por la app (`/columns`). Se cambian en SharePoint sin redesplegar.
- Sitio separado por ambiente (ADR-0020).

## Consecuencias

- **Positivas**: integridad por valor único, reportes con vistas y Excel, automatizaciones sin código propio.
- **Negativas**: crear columnas con nombres internos exactos es delicado (de ahí el script de aprovisionamiento opcional).
- **Riesgos**: umbral de vista de 5000 ítems → índices en las columnas filtradas y carpetas por año en la biblioteca.

## Cumplimiento / verificación

Checklist de `docs/06` §4. Mapper con pruebas T-05.

## Referencias

- `docs/03`, `docs/06` §2
