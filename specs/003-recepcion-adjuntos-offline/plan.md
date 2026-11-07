# Plan 003 — Recepción y adjuntos offline

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §5 (dominio), §6 (Dexie), §10 (archivos e imágenes), §12 (UI) · Modelo de datos §2.2, §3, §5 · UX §3.4–§3.7 · **Sistema de diseño `docs/10` §3, §4.3, §6 (referencias 03, 07, 08), §7.2, §7.3** · ADR 0005, 0008, 0011, 0012, **0022**

## 1. Contexto técnico

| Aspecto              | Valor                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003)                                                                                                                                                                                                                                        |
| UI                   | Sistema de diseño de la spec 001 (`src/shared/ui/`, React Aria Components + CSS Modules + tokens, ADR-0022). Esta spec **agrega** al catálogo: `ComboboxField`, `DateChip`, `Calendar`, `RangeCalendar`, `DateRangeFilter`, `PillInput` (buscador), `PhotoGallery`/`PhotoTile` |
| Almacenamiento       | Dexie: tablas `servicios`, `adjuntos`, `catalogos` (ya creadas en la spec 002)                                                                                                                                                                                                 |
| Integraciones        | Ninguna remota. Solo APIs del navegador: `input[type=file][capture]`, `getUserMedia`, `crypto.subtle`, `navigator.storage.estimate()`, Web Workers                                                                                                                             |
| Librerías nuevas     | `browser-image-compression` (ya en el stack), `@tanstack/react-virtual`                                                                                                                                                                                                        |
| Pruebas              | Vitest + fake-indexeddb · Testing Library · Playwright (`chromium-mobile`, `webkit-mobile`) con auth mock                                                                                                                                                                      |
| Plataformas          | PRD §11                                                                                                                                                                                                                                                                        |
| Desempeño            | Foto 12 MP ≤ 2 s (gama media), búsqueda < 200 ms con 500 servicios, autoguardado con debounce de 800 ms                                                                                                                                                                        |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                                                                                                                                                                            |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I Offline primero           | ✅       | Sin llamadas de red. Catálogos leídos de Dexie                                                                                                                                                                                                                                  |
| II Cero pérdida             | ✅       | Autoguardado transaccional. `descartarBorrador` solo acepta `estado = BORRADOR` (prueba T010). La foto se persiste antes de mostrar "Guardado"                                                                                                                                  |
| III Sin backend ni secretos | ✅       | No aplica a la red                                                                                                                                                                                                                                                              |
| IV Identidad confirmada     | ✅       | No hay escritura remota. `capturadoPor` sale de la cuenta cacheada (`AuthPort.cuentaActiva()`)                                                                                                                                                                                  |
| V Idempotencia              | ✅       | `id` UUID v4 y `adjunto.id` generados localmente. `sha256` evita duplicados                                                                                                                                                                                                     |
| VI Dominio puro             | ✅       | Validación, normalización, código y transición en `domain/`. Casos de uso en `application/`. El procesamiento de imágenes queda detrás del puerto `ImageProcessor`                                                                                                              |
| VII Pruebas primero         | ✅       | T004–T011 antes de T012–T020                                                                                                                                                                                                                                                    |
| VIII Accesible y es-CO      | ✅       | Etiquetas, `aria-describedby` en los errores, foco al primer error, textos en `locales/es-CO/servicios.json` y `adjuntos.json`. ComboBox y RangeCalendar de React Aria (teclado y lectores de pantalla). Solo tokens y componentes de `docs/10`. axe y capturas en 360/768/1280 |
| IX Seguridad                | ✅       | Las imágenes se re-codifican (no se guarda el binario original). EXIF y GPS eliminados. Object URLs revocados                                                                                                                                                                   |
| X Simplicidad               | ✅       | Sin decodificador HEIC ni editor de imágenes                                                                                                                                                                                                                                    |
| XI Trazabilidad             | ✅       | FR → RF en la spec. Tareas con IDs de historia                                                                                                                                                                                                                                  |

## 3. Diseño de la funcionalidad

### 3.1 Archivos

```
src/domain/
  validaciones.ts              # (spec 002) + esquemaRecepcion (si falta)
  normalizacion.ts             # normalizarCodigoAlfanumerico, normalizarMarca
  codigo.ts                    # (spec 002) generarCodigo
src/application/
  servicios/crearBorrador.ts           # (spec 002) — se reutiliza
  servicios/actualizarCampos.ts        # (spec 002) — se reutiliza
  servicios/completarEtapa.ts          # (spec 002) — se reutiliza
  servicios/descartarBorrador.ts       # (spec 002) — se reutiliza
  servicios/buscarServicios.ts         # NUEVO: filtro y búsqueda en memoria
  servicios/detectarSerieDuplicada.ts  # NUEVO
  adjuntos/agregarFoto.ts              # NUEVO
  adjuntos/eliminarAdjunto.ts          # NUEVO
  ports/ImageProcessor.ts              # NUEVO (si no existe)
  ports/StoragePort.ts                 # NUEVO: estimate() → {usado, cuota, ratio}
src/infrastructure/
  media/imageProcessor.ts      # browser-image-compression (worker local), miniatura, HEIC → error
  media/hash.ts                # sha256(Blob)
  pwa/storage.ts               # StoragePort con navigator.storage
src/features/servicios/
  pages/ListaServiciosPage.tsx
  pages/DetalleServicioPage.tsx
  pages/EtapaRecepcionPage.tsx
  components/FormRecepcion.tsx
  components/CampoCliente.tsx      # ComboboxField sin texto libre (allowsCustomValue=false)
  components/CampoMarca.tsx        # ComboboxField con texto libre (allowsCustomValue)
  components/LineaTiempoEtapas.tsx
  components/FiltrosServicios.tsx  # ResponsiveDialog (Sheet en compacto) o panel en línea (expandido); DateRangeFilter
  components/ListaDetalleLayout.tsx # expandido: lista (5 col.) + detalle (7 col.) en la misma vista
  components/AvisoSerieDuplicada.tsx
  hooks/useAutoguardado.ts
src/features/adjuntos/
  components/AdjuntosEtapa.tsx     # galería + botones de captura + límites
  components/BotonesCaptura.tsx    # cámara / galería / archivo / webcam
  components/CapturaWebcam.tsx     # getUserMedia (lazy)
  components/VisorImagen.tsx       # pantalla completa + zoom (lazy)
  hooks/useObjectUrl.ts
src/shared/ui/                     # se agregan al catálogo (docs/10 §3) y a /tecnico/ui
  ComboboxField.tsx                # RAC ComboBox, estilo .text-field
  DateChip.tsx  Calendar.tsx  RangeCalendar.tsx  DateRangeFilter.tsx   # referencia 08 (RAC DatePicker / Calendar / RangeCalendar, es-CO, semana desde el lunes)
  PillInput.tsx                    # buscador (RAC SearchField, variante outlined)
  PhotoGallery.tsx  PhotoTile.tsx  # miniaturas en CardInner con SyncBadge
  AvisoAlmacenamiento.tsx          # sobre Banner
  # StatusBadge y SyncBadge ya existen (spec 001)
src/locales/es-CO/servicios.json  adjuntos.json
tests/e2e/recepcion-offline.spec.ts
tests/fixtures/img/{foto-12mp.jpg, rotada-exif.jpg, foto.png, foto.heic}
```

### 3.2 Contratos

```ts
// application/adjuntos/agregarFoto.ts
export interface AgregarFotoEntrada {
  servicioId: string;
  tipo: 'FOTO_INGRESO' | 'FOTO_SALIDA';
  archivo: File | Blob;
}
export type AgregarFotoResultado =
  | { ok: true; adjunto: Adjunto }
  | {
      ok: false;
      error: 'DUPLICADA' | 'LIMITE_MAXIMO' | 'FORMATO_NO_SOPORTADO' | 'ALMACENAMIENTO_LLENO';
    };
export function crearAgregarFoto(deps: {
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
  imagenes: ImageProcessor;
  almacenamiento: StoragePort;
  ids: IdGenerator;
  reloj: Clock;
  config: () => ConfigApp;
  auth: AuthPort;
}): (e: AgregarFotoEntrada) => Promise<AgregarFotoResultado>;

// application/servicios/buscarServicios.ts
export interface FiltroServicios {
  texto?: string;
  estados?: EstadoServicio[];
  tipo?: TipoEquipo;
  clienteId?: number;
  soloPendientes?: boolean;
}
export function filtrarServicios(lista: Servicio[], f: FiltroServicios): Servicio[]; // función pura

// application/ports/StoragePort.ts
export interface StoragePort {
  estimar(): Promise<{ usado: number; cuota: number; ratio: number }>;
}
```

### 3.3 Flujo de "agregar foto"

```
1. almacenamiento.estimar() → si ratio ≥ 0.95 → ALMACENAMIENTO_LLENO
2. contar adjuntos del tipo → si ≥ Max → LIMITE_MAXIMO
3. imagenes.optimizar(archivo, {maxLado, calidad})  ── lanza FormatoNoSoportado → FORMATO_NO_SOPORTADO
4. imagenes.miniatura(blobOptimizado, 320)
5. sha256(blobOptimizado) → si existe en el mismo servicio y tipo → DUPLICADA
6. transacción Dexie: adjuntos.put({id, servicioId, tipo, blob, miniatura, sha256, syncState:'local' o 'pending', …})
   + servicios.update(actualizadoEn; syncState 'pending' si el servicio no está en BORRADOR)
7. devolver ok
```

- El sha256 se calcula sobre la imagen **optimizada** (la misma foto produce el mismo resultado con los mismos parámetros).
- En `BORRADOR` el adjunto queda como `syncState='local'`. Al completar la recepción, `completarEtapa` pasa los adjuntos a `pending` (dentro de la misma transacción).

### 3.4 Decisiones locales

- **Worker de compresión**: configurar `libURL` de `browser-image-compression` hacia un archivo local copiado a `public/` (o importar el worker con Vite), nunca un CDN (CSP, SDD §14.2). Se confirma en el spike S8.
- **Búsqueda**: `useLiveQuery` trae los servicios (los cerrados antiguos se purgan, así que el volumen es acotado) y `filtrarServicios` filtra en memoria con `useDeferredValue` para no bloquear la escritura.
- **Combobox de cliente**: `ComboboxField` (RAC `ComboBox`) con `allowsCustomValue={false}` y filtro propio por `includes` sin tildes (`normalize('NFD')`). El de marca usa `allowsCustomValue`.
- **Fechas**: `DateChip` (disparador con la fecha "lun, 15 sep 2026") + `Calendar` en un popover (o en `ResponsiveDialog` en compacto). Rango en `RangeCalendar` con la píldora `accent` y domingos y festivos en `--danger` (referencia 08). Con `@internationalized/date`, la fecha `yyyy-MM-dd` del dominio se convierte con `parseDate`/`toString`. Validación `maxValue = today`.
- **Adaptación por breakpoint** (`docs/10` §4.3):
  - _Formulario de recepción_: compacto = `Card fill` pegada a la BottomNav con el `PrimaryButton` fijo abajo (referencia 03); medio = `Card` centrada de máx. 720 px; expandido = `Card` de máx. 960 px con campos en **2 columnas** (grid de 12, cada campo de 6) y botones al final (`docs/10` §7.3).
  - _Lista de servicios_: compacto = `ListRow` a pantalla completa (punto de color de estado, código, cliente · marca, `SyncBadge`; estilo de la referencia 07) y detalle en otra pantalla; medio = tarjetas en 2 columnas; expandido = `ListaDetalleLayout` (lista de 5 col. + detalle de 7 col.; `/servicios/:id` mantiene la lista visible) (`docs/10` §7.2).
  - _Filtros_: compacto = botón "Filtros" → `ResponsiveDialog` (Sheet inferior) con la tarjeta de la referencia 08 (`PillInput`, `SelectField` Estado, `ComboboxField` Cliente, Tipo, `DateRangeFilter` de la fecha de recepción, "APLICAR" + "LIMPIAR"); medio = Sheet lateral; expandido = panel en línea arriba de la lista con el RangeCalendar en un popover.
  - _Galería_: 3 / 4 / 6 por fila. Visor en `ResponsiveDialog` (pantalla completa en compacto).
  - _Detalle_: cabecera con `PhotoCarousel` (referencia 05) cuando existan fotos. El componente se crea en la **007**; aquí se usa `PhotoGallery` y se deja el espacio.
- **Botones de captura**: `SecondaryButton` con ícono (`photo_camera`, `image`, `upload_file`, `videocam`); el principal de la etapa es `PrimaryButton` "COMPLETAR RECEPCIÓN".
- **Autoguardado**: `useAutoguardado(watch, guardar, 800)` con `react-hook-form`; guarda solo los campos que cambiaron mediante `actualizarCampos` y muestra el estado `guardando | guardado | error`.
- **Webcam**: se ofrece si `navigator.mediaDevices?.getUserMedia` existe y `matchMedia('(pointer: fine)')`. En táctil se usa `capture`.
- **Visor**: CSS `touch-action: pinch-zoom` sobre `<img>`, sin una librería de zoom.

## 4. Estrategia de pruebas

| Nivel  | Qué                                                                                                                                        | Archivo                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Unit   | Normalización y regex de serie, referencia y marca; esquema de recepción; código                                                           | `src/domain/normalizacion.test.ts`, `validaciones.test.ts`, `codigo.test.ts` |
| Unit   | `filtrarServicios` (texto sin tildes, estados, pendientes)                                                                                 | `src/application/servicios/buscarServicios.test.ts`                          |
| Int    | `agregarFoto`: ok, duplicada, límite, formato, almacenamiento lleno (ImageProcessor y StoragePort falsos)                                  | `src/application/adjuntos/agregarFoto.int.test.ts`                           |
| Int    | `detectarSerieDuplicada` solo con servicios abiertos                                                                                       | `…/detectarSerieDuplicada.int.test.ts`                                       |
| Int    | `descartarBorrador` rechaza los no-borradores y elimina las fotos                                                                          | `…/descartarBorrador.int.test.ts`                                            |
| Int    | `imageProcessor` real en jsdom no es viable → prueba en el navegador vía Playwright con fixtures (tamaño < 1 MB, lado ≤ 1920, orientación) | `tests/e2e/imagen-procesamiento.spec.ts`                                     |
| Comp   | `FormRecepcion`: errores, lista de faltantes, foco, autoguardado                                                                           | `src/features/servicios/components/FormRecepcion.test.tsx`                   |
| Comp   | `AdjuntosEtapa`: límites, eliminar, progreso                                                                                               | `src/features/adjuntos/components/AdjuntosEtapa.test.tsx`                    |
| Comp   | `ComboboxField`, `DateChip`/`Calendar`/`RangeCalendar`/`DateRangeFilter` (teclado, es-CO, `maxValue`, rango)                               | `src/shared/ui/*.test.tsx`                                                   |
| E2E    | ES-003-01…04 en modo offline + recarga (T-19 del plan de pruebas) + axe                                                                    | `tests/e2e/recepcion-offline.spec.ts`                                        |
| Visual | Formulario de recepción, lista, lista y detalle y filtros en 360/768/1280                                                                  | `tests/e2e/visual.spec.ts`                                                   |

## 5. Riesgos

| Riesgo                                                      | Mitigación                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Memoria en gama baja al procesar varias fotos               | Procesamiento secuencial, liberar los blobs intermedios, `maxIteration` acotado               |
| iOS entrega HEIC desde la galería                           | Safari suele convertir al seleccionar. Si no puede decodificar → error controlado (ES-003-17) |
| `capture` ignorado en algunos navegadores de escritorio     | Se ofrece "Archivo" y "Webcam" como alternativa                                               |
| La cuota informada por `estimate()` es aproximada en Safari | Umbrales conservadores (80/95 %)                                                              |

## 6. Seguimiento de complejidad

| Desviación | Por qué | Alternativa simple rechazada |
| ---------- | ------- | ---------------------------- |
| —          | —       | —                            |
