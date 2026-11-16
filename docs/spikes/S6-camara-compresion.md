# S6 — Cámara con `capture` y tiempo de compresión de fotos de 12 MP

> Tarea T049 · ADR-0011 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha: ______

## Preguntas

1. ¿La cámara trasera se abre correctamente en iOS y Android desde la app instalada y la **orientación** de la foto es la correcta?
2. ¿Cuánto tarda en comprimirse una foto de 12 MP en un celular de **gama media** y de **gama baja**? ¿Qué peso final queda?
3. ¿Qué pasa con una foto **HEIC** de iPhone elegida de la galería?

**Criterio de éxito:** < 2 s en gama media y < 4 s en gama baja por foto. Peso final de ~200–600 KB (JPEG ≤ 1920 px, calidad 0.75, miniatura de 320 px — ADR-0011).

## Cómo se mide

La app registra por cada foto el evento **`adjunto.agregado`** con el **tiempo de procesado** (`procesadoMs`), el **peso original** (`origenBytes`) y el **peso final** (`bytes`). Se lee en **Más → Técnico → Registros de eventos** (cuenta con rol Administrador): fila `adjunto.agregado`, columna de mensaje, por ejemplo `{"procesadoMs":850,"origenBytes":4200000,"bytes":380000,…}`. No hace falta cronómetro.

> El tiempo `procesadoMs` cubre desde que se entrega el archivo hasta que está comprimido y con miniatura. No incluye abrir la cámara ni guardar en la base.

## Preparación

- Dispositivos (anota **modelo, año, RAM y SO**): un iPhone, un Android de gama media y uno de gama baja (o el más antiguo que tengas). Si solo tienes uno, anótalo y que conste.
- App instalada, sesión iniciada, **un servicio en recepción** abierto.
- **Cámara en 12 MP** (la resolución por defecto de la mayoría; si el teléfono hace 48/50 MP, déjalo en la resolución por defecto y anótalo). Para la prueba de galería, ten **5 fotos de ≥ 8 MP** en el teléfono.

## Pasos (en cada dispositivo)

1. En el formulario de recepción pulsa **Tomar foto**. Anota si se abre la **cámara trasera** (no la selfie) y si pide permiso de cámara.
2. Toma **una foto en vertical** y **una en horizontal**. Comprueba en la miniatura y en el visor que **salen derechas** (orientación EXIF correcta). Anota cualquier giro.
3. Repite hasta tener **5 fotos tomadas** con la cámara. Anota si la interfaz se «congela» al procesar.
4. Pulsa **Galería** y selecciona **5 fotos de una vez** (≥ 8 MP). Anota si se procesan todas y cuánto tardó el conjunto.
5. En **Registros de eventos** anota para cada foto `procesadoMs`, `origenBytes` y `bytes`.
6. **iPhone:** elige una foto **HEIC** de la galería (si la cámara está en «Alta eficiencia», las fotos del iPhone lo son). Anota si la app la acepta o muestra el aviso «Formato no soportado. Usa JPG, PNG o WebP…» (error controlado, SDD §10.2). Anota también si iOS la **convierte a JPEG** al elegirla.
7. Intenta añadir **más fotos que el máximo** configurado (ingreso/salida): debe aparecer «Ya alcanzaste el máximo de fotos permitido.».
8. **Webcam (Windows/Mac, opcional):** en escritorio aparece el botón **Cámara del equipo**; debe abrir la webcam. Anótalo.

## Resultado

Dispositivos:

| Dispositivo | Gama         | SO / navegador | RAM |
| ----------- | ------------ | -------------- | --- |
|             | media / baja |                |     |

Por foto (`procesadoMs` en ms; pesos en KB):

| Dispositivo | Foto | Origen              | `procesadoMs` | Peso original | Peso final | Orientación OK |
| ----------- | ---- | ------------------- | ------------- | ------------- | ---------- | :------------: |
|             | 1    | cámara vertical     |               |               |            |                |
|             | 2    | cámara horizontal   |               |               |            |                |
|             | 3    | cámara              |               |               |            |                |
|             | 4    | cámara              |               |               |            |                |
|             | 5    | cámara              |               |               |            |                |
|             | 6–10 | galería (lote de 5) |               |               |            |                |

Resumen por dispositivo: mediana de `procesadoMs` ______ · máximo ______ · peso final típico ______

Otros: ¿cámara trasera? ______ · ¿HEIC? ______ · ¿se congela la pantalla? ______ · ¿aviso de máximo? ______

## Decisión

- [ ] Gama media < 2 s y gama baja < 4 s → ADR-0011 se mantiene; pasar a `Aceptado`. Registrar también el resultado de **CE-003-04** (tiempo y peso de una foto) en la spec 003 §8.
- [ ] Gama baja entre 4 y 8 s → mover la compresión a un **Web Worker** (ADR-0011 ya lo contempla) o bajar el tamaño máximo a 1600 px.
- [ ] La orientación sale mal → corregir el manejo de EXIF en `infrastructure/media/`.
- [ ] HEIC falla sin mensaje, o iOS no lo convierte a JPEG y no se pueden adjuntar fotos → mejorar el aviso o añadir conversión HEIC.

Notas / observaciones adicionales:
