# UX — Navegación, pantallas y menús

> Mobile-first. Idioma es-CO. Accesibilidad WCAG 2.2 AA. Decisión relacionada: ADR-0022.
> **Estilo visual y adaptación por dispositivo**: [10-Sistema-de-Diseno.md](10-Sistema-de-Diseno.md), que **manda** sobre lo visual de este documento. Este documento define _qué_ contiene cada pantalla y su comportamiento. Los wireframes de abajo son de contenido, no de estilo. La correspondencia con las pantallas de referencia está en `10` §6.
> Este documento cubre los menús que exige la guía base (§2: versión, uso, configuración inicial, menú técnico, menú de usuario, tamaño de fuente, ayuda, información de la app).

## 1. Navegación

| Ancho                        | Patrón                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| < 600 px (compacto: celular) | **BottomNav con degradado** (referencia 04–10), 4 pestañas: Inicio · Servicios · Sincronizar · Más. FAB amarillo "+ Nuevo" |
| 600–1023 px (medio: tablet)  | **NavRail** vertical con degradado (íconos + etiqueta) + contenido                                                         |
| ≥ 1024 px (expandido: PC)    | **Sidebar** con degradado + lista y detalle en dos columnas en Servicios                                                   |

Detalle de cada breakpoint en `10-Sistema-de-Diseno.md` §4.

La barra superior siempre muestra el título, el **indicador de conexión** (🟢 En línea / ⚪ Sin conexión) y el **contador de pendientes** (abre Sincronizar).

## 2. Mapa de rutas

| Ruta                            | Pantalla                                                                                                                  | Guard                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `/instalar`                     | Instalar la app                                                                                                           | —                                             |
| `/configuracion-inicial`        | Asistente de primer uso                                                                                                   | InstallGate                                   |
| `/`                             | Inicio                                                                                                                    | Setup, Install                                |
| `/servicios`                    | Lista de servicios                                                                                                        | Setup, Install                                |
| `/servicios/nuevo`              | Nueva recepción (crea el borrador y redirige al detalle)                                                                  | Rol Tecnico/Admin                             |
| `/servicios/:id`                | Detalle con línea de tiempo                                                                                               | Setup, Install                                |
| `/servicios/:id/etapa/:etapa`   | Formulario de la etapa (`recepcion`, `diagnostico`, `cotizacion`, `orden-trabajo`, `entrega`, `facturacion`, `anulacion`) | Rol según la transición                       |
| `/sincronizacion`               | Sincronizar, cola, errores y conflictos                                                                                   | Setup                                         |
| `/sincronizacion/conflicto/:id` | Resolver conflicto                                                                                                        | Setup                                         |
| `/alertas`                      | Alertas de vida útil                                                                                                      | Setup                                         |
| `/mas`                          | Menú "Más"                                                                                                                | —                                             |
| `/ajustes`                      | Tamaño de fuente, tema, cuenta                                                                                            | —                                             |
| `/ayuda` y `/ayuda/:tema`       | Ayuda y uso                                                                                                               | —                                             |
| `/acerca`                       | Versión y novedades                                                                                                       | —                                             |
| `/tecnico`                      | Menú técnico                                                                                                              | — (las acciones destructivas solo para Admin) |

## 3. Pantallas

### 3.1 Instalar la app (`/instalar`)

```
┌──────────────────────────────┐
│  [icono app]                 │
│  Instala ServicioTec         │
│  Para trabajar sin conexión  │
│  y no perder datos, instala  │
│  la app en este dispositivo. │
│                              │
│  ── Detectamos: iPhone ──    │
│  1. Toca  [⎋ Compartir]      │
│  2. "Agregar a inicio"       │
│  3. Abre la app desde el     │
│     ícono nuevo              │
│                              │
│  (Chrome/Edge) [ Instalar ]  │
│  (otros) Continuar sin       │
│          instalar ›          │
└──────────────────────────────┘
```

- Instrucciones por plataforma: Android/Chrome, Android/Samsung Internet, iOS/Safari, iOS con otro navegador ("Abre este enlace en Safari"), Windows/Edge, macOS/Chrome y macOS/Safari.
- En iOS no instalado no aparece "Continuar sin instalar".

### 3.2 Configuración inicial (`/configuracion-inicial`)

Asistente de 4 pasos con indicador de progreso:

1. **Bienvenida**: qué hace la app y qué se necesita (conexión ahora, cuenta de la empresa).
2. **Iniciar sesión**: botón "Iniciar sesión con Microsoft" → redirect. Al volver: nombre, correo y roles detectados.
3. **Preparar datos sin conexión**: lista de tareas con ✓ y spinner: conectar con SharePoint, descargar clientes, marcas y opciones, descargar configuración, descargar servicios abiertos (se agrega cuando exista la spec 006; antes se omite) y reservar almacenamiento (persistente: Sí/No, espacio disponible).
4. **Listo**: "Ya puedes trabajar sin conexión". Botón "Ir al inicio" y enlace a la ayuda.

Si algún paso falla: mensaje del error y botón Reintentar. No se puede avanzar sin el paso 2 y la descarga de catálogos.

### 3.3 Inicio (`/`)

```
┌──────────────────────────────┐
│ ServicioTec      ⚪ Sin red  ③│
├──────────────────────────────┤
│ Hola, Ana                    │
│ ┌──────────────────────────┐ │
│ │ ⚠ 3 registros pendientes │ │
│ │ de sincronizar (hace 26h)│ │
│ │ [Sincronizar]            │ │
│ └──────────────────────────┘ │
│ Mis trabajos                 │
│  Recibidos           4  ›    │
│  En reparación       2  ›    │
│  Por facturar        1  ›    │
│ Alertas de vida útil         │
│  Vencidas 1 · ≤30 días 3  ›  │
│ Borradores           1  ›    │
│                    ( + Nuevo)│
├──────────────────────────────┤
│ 🏠 Inicio 📋 Servicios ⟳ Sync ☰│
└──────────────────────────────┘
```

- Las tarjetas por estado varían según el rol. Técnico: Borradores, Recibidos, Cotizados aprobados, En reparación. Comercial: Diagnosticados, Cotizados pendientes, Entregados.
- Banner de advertencia de almacenamiento (≥ 80 %) y banner "Nueva versión disponible".

### 3.4 Lista de servicios (`/servicios`)

- Buscador (código, serie, número de solicitud, cliente, referencia).
- Filtros en chips: Estado (múltiple), Tipo (Batería/Cargador), Cliente, "Solo pendientes de sync".
- Cada fila muestra el ícono del tipo, el código, el cliente, la marca y referencia, el **badge de estado**, el **badge de sync** (✓ sincronizado, ⟳ pendiente, ⚠ error, ⇄ conflicto, ✎ borrador) y la fecha de recepción.
- Lista virtualizada. Orden por defecto: `actualizadoEn` descendente.

### 3.5 Detalle del servicio (`/servicios/:id`)

```
┌──────────────────────────────┐
│ ‹  CAR-1-NV4520     ⟳ Pend.  │
│ NAVAR ASOCIADOS · ROQUET     │
│ 48VDC450A · Serie NV4520     │
│ [Estado: En reparación]      │
├──────────────────────────────┤
│ ● Recepción      15/09/2026 ✓│
│   📷×3  ver ›                │
│ ● Diagnóstico    16/09/2026 ✓│
│   Reparable · 📄 formato     │
│ ● Cotización     17/09/2026 ✓│
│   Aprobada · $ 1.250.000     │
│ ◉ Orden de trabajo  (actual) │
│   [ Continuar ]              │
│ ○ Entrega                    │
│ ○ Facturación                │
├──────────────────────────────┤
│ ⋯ Acciones: Anular (Admin)   │
└──────────────────────────────┘
```

- Línea de tiempo vertical. Las etapas completadas se pueden expandir en solo lectura (o "Editar" para Admin).
- La etapa actual muestra un botón con la acción de la transición disponible para el rol. Si no tiene el rol: "Pendiente de Comercial".
- Si `syncState = conflict`: banner rojo "Hay diferencias con SharePoint" [Resolver].
- Si `syncState = error`: banner con el mensaje y [Reintentar].

### 3.6 Formulario de etapa (`/servicios/:id/etapa/:etapa`)

- Un formulario por etapa con los campos del modelo de datos. En celular, por secciones con scroll.
- Indicador de autoguardado: "Guardado en el dispositivo ✓ 10:42".
- Botón primario fijo abajo: **"Completar recepción" / "Completar diagnóstico" / …**. Deshabilitado con la lista de lo que falta ("Falta: 1 foto de ingreso, serie").
- **Campo cliente**: `ComboboxField` con autocompletado desde el catálogo local, sin texto libre. Si el cliente no existe: texto de ayuda "¿No está el cliente? Pide a un administrador que lo agregue en SharePoint y sincroniza".
- **Campo marca**: `ComboboxField` con texto libre que se normaliza a MAYÚSCULAS.
- **Referencia y serie**: se normalizan mientras se escribe. Teclado `inputMode="text"` con `autoCapitalize="characters"`.
- **Número de solicitud**: no es un campo. El formulario muestra el aviso «El número de solicitud se asigna solo cuando el servicio se sincroniza» y el detalle muestra «Pendiente» hasta entonces (ADR-0024).
- **Fechas**: `DateChip` + `Calendar` (estilo de la referencia 08) con validación de rango.
- **Diagnóstico**: `SelectField` con los valores de SharePoint. Si se elige el valor DF, aparecen los campos de disposición final y el aviso "Se cerrará el registro sin reparación".
- **Moneda**: entrada numérica con formato COP al perder el foco.
- **Proyección de vida útil**: se sugiere fecha de entrega + 12 meses, con chips rápidos (+6 m, +12 m, +18 m, +24 m).

### 3.7 Componente de adjuntos (galería)

```
 Fotos de ingreso (2 de 1–5)
 ┌────┐ ┌────┐ ┌────┐
 │img │ │img │ │ +  │
 │ ⟳  │ │ ✓  │ │    │
 └────┘ └────┘ └────┘
 [📷 Tomar foto] [🖼 Galería]   (PC: [📁 Archivo] [🎥 Webcam])
```

- Cada miniatura tiene un badge de sync y un menú: Ver, Eliminar (con confirmación, solo en la etapa actual).
- Barra de progreso de la compresión ("Optimizando 2 de 5…").
- PDF: tarjeta con ícono, nombre, tamaño, [Ver] y [Reemplazar].

### 3.8 Sincronización (`/sincronizacion`)

```
┌──────────────────────────────┐
│ Sincronización               │
│ Última: hoy 08:15 ✓          │
│ Pendientes: 3 registros,     │
│ 11 archivos (6,2 MB)         │
│                              │
│ Cuenta: Ana Pérez            │
│ ana@empresa.com  [Cambiar]   │
│                              │
│ [ Confirmar y sincronizar ]  │
├──────────────────────────────┤
│ Progreso                     │
│ CAR-1-NV4520   ✓             │
│ BAT-7-X99      ⟳ foto 3/5 ▓▓░│
│ BAT-8-Y10      en cola       │
├──────────────────────────────┤
│ Con error (1)                │
│ BAT-2-AB1  Sin permiso en SP │
│            [Reintentar]      │
│ Conflictos (0)               │
└──────────────────────────────┘
```

- Sin conexión: botón deshabilitado con el texto "Sin conexión. Tus datos están seguros en este dispositivo".
- Versión obsoleta: botón reemplazado por [Actualizar app].
- Al terminar: resumen en un diálogo (subidos, descargados, errores, conflictos).
- Botón "Cancelar" durante el sync.

### 3.9 Resolver conflicto (`/sincronizacion/conflicto/:id`)

Tabla por campo con dos tarjetas seleccionables, **Mi valor** y **SharePoint** (con quién y cuándo lo modificó, si viene en los datos), y el botón "Aplicar y sincronizar".

### 3.10 Alertas (`/alertas`)

Pestañas generadas desde `UmbralesAlertaDias` (por defecto **Vencidas · ≤30 · ≤60 · ≤90 días**). Filtro por cliente. Cada fila muestra el código, el cliente, la fecha proyectada y los días restantes, y abre el detalle.

## 4. Menú "Más" (`/mas`)

| Sección           | Opción                              | Audiencia            | Contenido                                                                                                                                                                             |
| ----------------- | ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Usuario**       | Mi cuenta                           | Todos                | Nombre, correo, roles, último login. [Cambiar de cuenta] [Cerrar sesión] (avisa si hay pendientes; nunca los borra)                                                                   |
|                   | Ajustes                             | Todos                | **Tamaño de fuente**: Normal / Grande / Muy grande (vista previa en vivo). Recordar filtros. (Sin selector de tema en v1.0)                                                           |
|                   | Alertas                             | Todos                | Atajo a `/alertas`                                                                                                                                                                    |
| **Ayuda**         | Cómo usar la app                    | Todos                | Guías por etapa con capturas: recepción, diagnóstico, disposición final, cotización, OT, entrega, facturación                                                                         |
|                   | Trabajar sin conexión y sincronizar | Todos                | Qué se guarda, cuándo sincronizar, qué significan los íconos                                                                                                                          |
|                   | Instalar la app                     | Todos                | Las mismas instrucciones de `/instalar` para cada plataforma                                                                                                                          |
|                   | Preguntas frecuentes                | Todos                | "Se me llenó el espacio", "No aparece un cliente", "Error de permiso", "Cambié de celular"                                                                                            |
| **Información**   | Acerca de                           | Todos                | Nombre, **versión** (SemVer), commit, fecha de build, ambiente (DEV/PRD), novedades (CHANGELOG embebido), licencia, aviso de privacidad (uso de la cámara; no se guarda la ubicación) |
| **Técnico**       | Menú técnico                        | Todos (ver tabla §5) | Diagnóstico y soporte                                                                                                                                                                 |
| **Configuración** | Configuración inicial               | Todos                | Repetir el asistente (refresca IDs y catálogos; no borra datos)                                                                                                                       |

## 5. Menú técnico (`/tecnico`)

| Opción                 | Rol   | Descripción                                                                                                                      |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| Estado del dispositivo | Todos | Plataforma, navegador, standalone sí/no, almacenamiento persistente sí/no, uso/cuota, `dispositivoId`, versión del esquema de DB |
| Estado de SharePoint   | Todos | URL del sitio, `siteId`, IDs de listas y drive, última sync, método de pull (delta/filtro)                                       |
| Registros (logs)       | Todos | Visor con filtro por nivel y búsqueda. [Copiar] [Exportar .json]                                                                 |
| Exportar respaldo      | Todos | ZIP con `servicios.json` (pendientes o todos), adjuntos y logs. [Compartir] (Web Share) o [Descargar]                            |
| Importar respaldo      | Admin | Importa un ZIP. Los registros quedan pendientes y se omiten los que ya existen                                                   |
| Refrescar catálogos    | Todos | Requiere conexión                                                                                                                |
| Buscar actualización   | Todos | `registration.update()`                                                                                                          |
| Reintentar errores     | Todos | Pone `intentos=0` en todos los registros con error                                                                               |
| Liberar espacio        | Todos | Ejecuta la purga segura ya (solo lo sincronizado) e informa cuánto liberó                                                        |
| Restablecer la app     | Admin | Borra la DB local **solo si no hay pendientes**. Con pendientes exige antes exportar el respaldo y escribir "BORRAR"             |

## 6. Estados y feedback

- **Badges de estado** (color + texto, nunca solo color): Borrador (gris), Recibido (azul), Diagnosticado (azul oscuro), Cotizado (morado), En reparación (naranja), Entregado (verde azulado), Facturado (verde), Disposición final (marrón), Anulado (gris tachado).
- **Toasts** (`Toast`): guardado, sincronizado, errores breves. Los errores importantes van en un `Banner` dentro de la pantalla.
- **Estados vacíos** con ilustración simple y acción ("Aún no hay servicios. [+ Nuevo]").
- **Skeletons** mientras cargan las consultas Dexie (son rápidas, pero evitan saltos visuales).

## 7. Accesibilidad

- Todos los controles con etiqueta visible y asociada. Errores con `aria-describedby` y foco al primer error al intentar completar una etapa.
- Objetivos táctiles ≥ 44 × 44 px. Contraste ≥ 4.5:1.
- Navegación completa por teclado en PC, con un orden de foco lógico.
- El escalado de fuente no rompe el diseño hasta 130 % de la escala propia + 200 % del zoom del navegador.
- `prefers-reduced-motion` respetado.
- Pruebas automáticas con `@axe-core/playwright` en las pantallas principales.
