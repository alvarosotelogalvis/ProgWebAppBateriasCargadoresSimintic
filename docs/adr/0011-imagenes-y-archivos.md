# ADR-0011 — Fotos optimizadas en el cliente (JPEG ≤ 1920 px, q = 0,75) y manejo de PDF

- **Estado**: Aceptado (optimizar fotos y permitir cámara o archivos) · Propuesto (parámetros)
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (fotos optimizadas, cámara del dispositivo, PDF); parámetros propuestos por Claude
- **Origen en la guía**: `02-App-Web.md` §3.6 (optimización de imágenes), `05-App-Movil.md` §8

## Contexto

Una foto de un celular pesa 3–8 MB. Varias fotos por servicio, guardadas offline y subidas con red móvil, agotan la cuota y los datos. El Excel pide "SUBIR JPG" y "SUBIR PDF".

## Opciones consideradas

- **Formato**: JPEG (universal, previsualización en SharePoint y en correos) vs. WebP (más liviano, pero menos compatible en las previsualizaciones y para clientes que descargan). → **JPEG**.
- **Dónde comprimir**: en el cliente (antes de guardar) vs. no comprimir. → **En el cliente, en un Web Worker**.
- **Librería**: `browser-image-compression` (madura, con worker, corrige EXIF) vs. canvas propio vs. `squoosh` WASM (pesado).

## Decisión

- Fotos: `browser-image-compression`, lado mayor de 1920 px, calidad 0,75, salida `image/jpeg`, orientación EXIF aplicada y **metadatos (incluido GPS) descartados**. Miniatura de 320 px. `sha256` para detectar duplicados. Procesamiento secuencial con progreso.
- Parámetros configurables desde `ConfiguracionApp` (`ImagenMaxLadoPx`, `ImagenCalidad`, mín./máx. de fotos).
- Captura: `<input capture="environment">` (cámara), galería o archivos, y webcam opcional en escritorio.
- PDF: validación de MIME + firma `%PDF-` y `MaxTamanoPdfMB` (20). Sin re-procesar.
- Subida: PUT simple ≤ 4 MB. Upload session por fragmentos de 3 200 KiB (múltiplo de 320 KiB), reanudable, para > 4 MB.
- Retención local de originales ya sincronizados: `RetencionOriginalesDias` (7). Las miniaturas se conservan.

## Consecuencias

- **Positivas**: fotos de ~250–600 KB, suficientes para evidenciar el estado del equipo, con subida rápida y menos cuota.
- **Negativas**: no se conserva el original a resolución completa (si en el futuro se necesitara para peritajes, haría falta un ADR nuevo).
- **Riesgos**: HEIC que el navegador no decodifica → error controlado (SDD §10.2). Rendimiento en gama baja → spike S6.

## Cumplimiento / verificación

Pruebas con fixtures (`tests/fixtures/img`) y spike S6.

## Referencias

- SDD §10
