# ADR-0023 — Clientes creados desde la app (permanentes) y fusión de clientes

- **Estado**: Aceptado (decisión del usuario: cliente permanente y fusionable) · Propuesto (detalles técnicos)
- **Fecha**: 2026-11-16
- **Decisores**: Álvaro Sotelo; detalles propuestos por Claude
- **Reemplaza parcialmente**: la regla «solo se elige un cliente del catálogo, sin texto libre» de la spec 003 (ES-003-05, FR-003-04). La lista `Clientes` sigue siendo el catálogo único.

## Contexto

Hoy el técnico solo puede elegir un cliente que ya exista en el catálogo local. El catálogo se descarga una vez y se actualiza al sincronizar, así que registrar un servicio no necesita red. Pero si llega un cliente nuevo y el dispositivo aún no lo conoce, el técnico en campo no puede registrar el servicio, lo que contradice el objetivo offline-first.

## Opciones consideradas

1. **Dejarlo como está** (el administrador agrega clientes en SharePoint). Bloquea al técnico en campo.
2. **Texto libre en el servicio.** Produce variantes del mismo cliente («ARIS», «Aris Mining»…) y rompe los reportes.
3. **Cliente nuevo provisional** que un administrador valida. Más trabajo de revisión y un estado intermedio que el usuario rechazó.
4. **Cliente nuevo permanente creado desde el formulario, con fusión posterior.** (elegida)

## Decisión

### Crear

- En el formulario, si el cliente no aparece, el técnico puede **«Agregar cliente nuevo»** escribiendo el nombre. Queda como un cliente normal y **permanente**: sin estado provisional ni aprobación.
- Se normaliza el nombre (MAYÚSCULAS, sin tildes, espacios colapsados). Si coincide con uno existente (activo o no), la app **lo sugiere en vez de crear un duplicado**.
- Sin conexión, el cliente se crea en el dispositivo con un identificador local (UUID) y se puede elegir de inmediato. **Al sincronizar, los clientes nuevos se suben antes que los servicios** y el servicio recibe el id real de SharePoint.
- **Idempotencia**: `Clientes` gana una columna `ClienteGuid` (UUID generado en el dispositivo) con valor único, y una columna `NombreNormalizado` también única. Si dos dispositivos crean el mismo cliente sin red, el segundo recibe el error de valor único, busca el existente y se enlaza a él. Nunca se duplica.

### Fusionar

- Solo el rol **Administrador**, con conexión, desde Técnico/Configuración → Clientes. Se elige un cliente **origen** y uno **destino**.
- La fusión **no borra** el origen: pasa a `Activo = No` con `FusionadoConId = id del destino`. Así se conserva el historial y se puede auditar.
- La app **reasigna** al destino todos los servicios del origen en SharePoint (por Graph, en lotes y reanudable: si se corta, se repite y continúa con los que falten).
- Los dispositivos reciben el origen como inactivo y fusionado en el siguiente pull. Un servicio local pendiente que apunte al origen se **reasigna al destino al sincronizar**, sin conflicto y sin perder datos.
- Las fusiones se registran en `LogSincronizacion` (quién, cuándo, origen, destino, cantidad de servicios).

### Permisos

- El grupo de técnicos pasa de _Lectura_ a _Colaborar_ en `Clientes` (el resto de catálogos sigue en lectura). Se actualizan `docs/06` §permisos y el script de aprovisionamiento.

## Consecuencias

- **Positivas**: el técnico nunca queda bloqueado por un cliente nuevo; el catálogo sigue siendo único y limpio; la fusión corrige errores sin perder historial.
- **Negativas**: más superficie de escritura (técnicos escriben en `Clientes`), una columna nueva con índice único y un flujo de fusión con operaciones por lotes en Graph.
- **Riesgos**: nombres casi iguales que la normalización no detecta (p. ej. «ARIS MINING» y «ARIS MINING SAS»): se resuelven con la fusión. Fusión interrumpida a medias: es reanudable por diseño.

## Cumplimiento / verificación

Pruebas unitarias de normalización y de decisión de fusión; integración con el emulador de Graph (valor único en `ClienteGuid`/`NombreNormalizado`, reasignación en lotes con corte); prueba en vivo contra SharePoint real (`npm run test:live`).

## Referencias

- ADR-0009 (modelo remoto), ADR-0010 (sincronización e idempotencia), ADR-0012 (roles por etapa)
- `docs/03-Modelo-de-Datos.md` §6.1, `docs/06-Configuracion-Tenant-M365.md`
- Spec 010 (`specs/010-clientes-nuevos-y-fusion/spec.md`)
