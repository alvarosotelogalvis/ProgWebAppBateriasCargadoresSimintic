# Spec 002 — Dominio y persistencia local

- **Estado**: Borrador
- **Fecha**: 2026-10-21 · **Rama**: `feature/002-dominio-persistencia-local`
- **Fase**: F1 (`docs/07`) · **Depende de**: 001 (andamiaje y capas)
- **Fuentes**: PRD [RF-03, RF-06, RF-07, RF-08, RF-14 (cálculo), RF-25, RF-27 (regla de no-pérdida); RNF-01, RNF-02, RNF-11, RNF-12] · ADR [0004, 0005, 0008, 0010 (merge), 0012] · Modelo de datos [§2–§6, §8]

> **Spec habilitadora**: no entrega pantallas. Entrega las reglas del negocio y el almacenamiento en el dispositivo que usan todas las demás specs. Sus escenarios se verifican con pruebas automáticas.

## 1. Resumen
Define **qué es un servicio y un adjunto**, qué reglas debe cumplir cada etapa, quién puede hacer cada cambio de estado y cómo se guarda todo en el dispositivo sin perder nada. También define cómo se calculan el código legible, los niveles de alerta de vida útil y la combinación de cambios propios y remotos.

## 2. Historias de usuario

### HU-002-1 — Mis datos nunca se pierden (Prioridad P1) 🎯
Como **técnico** quiero que todo lo que registro quede guardado en el dispositivo de forma segura, para no perder trabajo aunque la app se cierre, el teléfono se apague o la app se actualice.
**Por qué P1**: es el principio más importante del producto (Artículo II).
**Prueba independiente**: pruebas automáticas que crean, modifican, purgan y migran datos, y verifican que nada pendiente desaparece.

**Escenarios de aceptación**
- **ES-002-01** — **Dado** un servicio guardado, **cuando** se cierra y se reabre la base de datos, **entonces** el servicio y sus adjuntos (incluidos los archivos) están intactos.
- **ES-002-02** — **Dado** una operación que guarda un servicio junto con sus adjuntos, **cuando** falla a mitad, **entonces** no queda guardado ningún cambio parcial (todo o nada).
- **ES-002-03** — **Dado** servicios pendientes de sincronizar, **cuando** se ejecuta cualquier purga de datos antiguos, **entonces** ningún servicio ni archivo pendiente, con error, en conflicto o en borrador se elimina.
- **ES-002-04** — **Dado** un servicio en estado distinto de Borrador, **cuando** se intenta descartarlo, **entonces** la operación se rechaza y el servicio sigue intacto.
- **ES-002-05** — **Dado** un borrador, **cuando** se descarta, **entonces** se eliminan el servicio y todos sus adjuntos.

### HU-002-2 — Las reglas del flujo se aplican siempre igual (Prioridad P1)
Como **coordinador** quiero que cada cambio de etapa exija los mismos datos y los mismos permisos, sin importar la pantalla ni el dispositivo, para que los registros sean completos y confiables.
**Prueba independiente**: cada transición de la tabla del modelo de datos §5 se prueba como válida, con requisitos faltantes y con un rol incorrecto.
- **ES-002-06** — **Dado** un servicio Recibido con diagnóstico distinto de disposición final, observación y formato PDF, **cuando** un Técnico completa el diagnóstico, **entonces** pasa a **Diagnosticado**.
- **ES-002-07** — **Dado** un servicio Recibido con diagnóstico igual al valor configurado de disposición final, la fecha de socialización y los PDF requeridos, **cuando** se completa, **entonces** pasa a **Disposición final** (estado final) y no se ofrecen más etapas.
- **ES-002-08** — **Dado** un servicio Diagnosticado, **cuando** un Técnico (sin rol Comercial) intenta registrar la cotización, **entonces** la transición se rechaza por rol.
- **ES-002-09** — **Dado** un servicio Cotizado con la cotización Rechazada, **cuando** se registra la entrega con fecha y fotos de salida, **entonces** pasa a **Entregado** sin orden de trabajo y la proyección de vida útil es opcional.
- **ES-002-10** — **Dado** cualquier transición con requisitos incompletos, **cuando** se consultan las transiciones disponibles, **entonces** se devuelve la lista exacta de lo que falta (campo o adjunto), para mostrarla al usuario.
- **ES-002-11** — **Dado** un servicio en un estado no final, **cuando** un Administrador lo anula con un motivo de ≥ 10 caracteres, **entonces** pasa a **Anulado**, con fecha de anulación, y queda de solo lectura. Con un motivo más corto o sin rol Administrador, se rechaza.
- **ES-002-12** — **Dado** un servicio en una etapa ya completada, **cuando** se consultan los campos editables para un Técnico, **entonces** los campos de etapas anteriores no son editables. Para un Administrador sí lo son.

### HU-002-3 — Datos válidos y normalizados (Prioridad P1)
Como **coordinador** quiero que cada dato tenga el formato del Excel (solicitud numérica, referencia y serie alfanuméricas, fechas coherentes) para que los reportes funcionen.
- **ES-002-13** — **Dado** una serie " nv-4520 ", **cuando** se normaliza, **entonces** queda "NV-4520". Una serie con espacios internos o símbolos no permitidos es inválida.
- **ES-002-14** — **Dado** una fecha de entrega anterior a la de recepción, o una proyección de vida útil que no es posterior a la entrega, **cuando** se valida, **entonces** hay un error con una clave de mensaje específica.
- **ES-002-15** — **Dado** un número de solicitud "0" o con letras, **cuando** se valida, **entonces** es inválido.

### HU-002-4 — Cambios rastreados para sincronizar (Prioridad P1)
Como **técnico** quiero que la app sepa exactamente qué cambié desde la última sincronización, para que solo se suba eso y nunca se suba un borrador.
- **ES-002-16** — **Dado** un borrador, **cuando** se modifica, **entonces** sigue marcado como local (no sincronizable).
- **ES-002-17** — **Dado** un borrador completo, **cuando** se completa la recepción, **entonces** el servicio y todos sus adjuntos pasan a "pendiente".
- **ES-002-18** — **Dado** un servicio sincronizado, **cuando** se modifica dos veces el mismo campo y una vez otro, **entonces** queda "pendiente" con exactamente esos dos campos marcados como cambiados (sin duplicados).
- **ES-002-19** — **Dado** cualquier modificación, **cuando** se guarda, **entonces** se actualizan la fecha de última edición local y, si cambian tipo, solicitud o serie, el código legible.

### HU-002-5 — Combinar cambios propios y remotos sin perder nada (Prioridad P2)
Como **técnico** quiero que, si otra persona cambió el mismo registro, solo se me pregunte por los campos que realmente chocan.
- **ES-002-20** — **Dado** los cuatro casos de la tabla de combinación (SDD §9.5), **cuando** se combinan, **entonces** el resultado coincide con la tabla en todos los casos.
- **ES-002-21** — **Dado** que ambos cambiaron el estado, **cuando** se combinan, **entonces** gana el estado más avanzado del flujo. Si queda incoherente con los campos, se marca conflicto.

### HU-002-6 — Alertas y código calculados de forma consistente (Prioridad P2)
- **ES-002-22** — **Dado** umbrales 90/60/30, **cuando** faltan 45 días para la proyección, **entonces** el nivel es "60". Con −1 días es "Vencida". Con 120 días, ninguno.
- **ES-002-23** — **Dado** un cargador con solicitud 1 y serie NV4520, **cuando** se genera el código, **entonces** es `CAR-1-NV4520`.

### HU-002-7 — Registro técnico de lo que pasa (Prioridad P3)
Como **soporte** quiero un registro local de eventos y errores, para diagnosticar problemas en un dispositivo remoto.
- **ES-002-24** — **Dado** más de 2000 eventos registrados, **cuando** se agrega uno nuevo, **entonces** se descarta el más antiguo y el total se mantiene en 2000.
- **ES-002-25** — **Dado** un evento con datos que contienen un token o un archivo, **cuando** se registra, **entonces** esos datos no se guardan.

## 3. Casos borde
- La base de datos no puede abrirse (modo privado restrictivo, almacenamiento bloqueado): error tipado que la UI muestra como "Almacenamiento no disponible".
- Se alcanza la cuota a mitad de una escritura: la transacción falla completa y se devuelve un error de almacenamiento lleno.
- Un valor de catálogo remoto no reconocido (estado desconocido): el registro se conserva y se marca de solo lectura. Nunca se descarta.
- La configuración remota tiene valores inválidos: se usan los valores por defecto para esas claves y se registra una advertencia.
- Dos escrituras simultáneas sobre el mismo servicio (dos pestañas): la última gana a nivel de campo y la lista de campos cambiados se une, sin perder marcas.
- Reloj del dispositivo atrasado o adelantado: las validaciones "≤ hoy" usan la fecha local (riesgo aceptado, documentado en la 003).

## 4. Requisitos funcionales
| ID | El sistema debe… | Traza |
|---|---|---|
| FR-002-01 | Representar Servicio y Adjunto con todos los atributos del modelo de datos §2–§3, incluidos los de sincronización y auditoría | [RF-03, RNF-11] |
| FR-002-02 | Definir la configuración de la app con valores por defecto (modelo de datos §6.3) y combinarla con valores remotos validados | [RF-23] |
| FR-002-03 | Validar y normalizar los datos de cada etapa con reglas únicas y mensajes identificados por clave | [RF-06] |
| FR-002-04 | Aplicar la tabla completa de transiciones (estados, roles, requisitos) del modelo de datos §5, incluida la disposición final y la anulación | [RF-07, RF-08, RF-25] |
| FR-002-05 | Informar, para un servicio y un conjunto de roles, las transiciones disponibles y lo que falta para cada una | [RF-07] |
| FR-002-06 | Informar qué campos son editables según el estado y los roles | [RF-26] |
| FR-002-07 | Generar el código legible del servicio | [RF-03] |
| FR-002-08 | Calcular el nivel de alerta de vida útil por días restantes y umbrales configurables | [RF-14] |
| FR-002-09 | Combinar los valores locales, remotos y base campo por campo, produciendo el resultado y la lista de conflictos | [RF-12] |
| FR-002-10 | Guardar servicios, adjuntos (con archivos), catálogos, metadatos y registros en el dispositivo, con operaciones atómicas | [RNF-01] |
| FR-002-11 | Ofrecer lecturas reactivas: las pantallas se actualizan solas cuando cambian los datos guardados | [ADR-0005] |
| FR-002-12 | Crear borradores con un identificador único generado en el dispositivo, quién capturó, en qué dispositivo y cuándo | [RF-03] |
| FR-002-13 | Registrar cada modificación como cambio pendiente (campos cambiados, fecha de edición), salvo en borradores | [RF-10] |
| FR-002-14 | Al completar la recepción, pasar el servicio y todos sus adjuntos de "local" a "pendiente" en una sola operación | [RF-10] |
| FR-002-15 | Permitir descartar solo borradores y anular solo con rol Administrador y motivo | [RF-03, RF-25] |
| FR-002-16 | Impedir que cualquier purga elimine datos no sincronizados | [RF-27, RNF-01] |
| FR-002-17 | Mantener un registro local de eventos limitado a 2000 entradas, sin datos sensibles | [RNF-15] |
| FR-002-18 | Generar y conservar un identificador estable del dispositivo | [RNF-11] |

## 5. Entidades clave
- **Servicio**: equipo bajo una solicitud con todo su ciclo (identidad, recepción, diagnóstico, cotización, OT, entrega, facturación, anulación, auditoría, estado de sincronización, campos cambiados, valores base y conflictos).
- **Adjunto**: foto o PDF asociado a un servicio y un tipo de etapa, con archivo, miniatura, huella y estado de sincronización.
- **Transición**: cambio de estado con roles permitidos y requisitos.
- **Configuración de la app**: parámetros con valor por defecto y valor remoto opcional.
- **Catálogo**: clientes, marcas y valores de opciones descargados.
- **Metadato local**: identificador del dispositivo, IDs remotos, fechas de la última sincronización, configuración inicial completada.
- **Entrada de registro**: evento técnico con nivel, momento y correlación.

## 6. Criterios de éxito
- **CE-002-01**: 100 % de las transiciones probadas (válida, falta requisito, rol incorrecto).
- **CE-002-02**: cobertura ≥ 90 % en las reglas de negocio y los casos de uso (RNF-12).
- **CE-002-03**: 0 casos de pérdida de datos pendientes en la batería de pruebas de purga, descarte y fallas a mitad de operación.
- **CE-002-04**: guardar un cambio de campo tarda < 50 ms en un equipo de gama media (habilita el autoguardado de la 003).

## 7. Fuera de alcance
- Pantallas (specs 001, 003 y 007).
- Comunicación con SharePoint y uso del merge dentro de la sincronización (specs 005 y 006).
- Ejecución programada de purgas (spec 009). Aquí solo existen las operaciones seguras del repositorio.
- Migraciones a una versión 2 del almacenamiento (no hay aún. Se define la regla y la prueba patrón).

## 8. Aclaraciones
| Fecha | Pregunta | Respuesta |
|---|---|---|
| — | [NECESITA ACLARACIÓN: valores del diagnóstico — por defecto: leídos de SharePoint; disposición final = valor configurado "D. FINAL" (PA-01)] | — |
| — | [NECESITA ACLARACIÓN: ¿rechazo de cotización → entrega sin reparar? — por defecto: sí (PA-03)] | — |
| — | [NECESITA ACLARACIÓN: ¿solicitud única? — por defecto: no (PA-07)] | — |
| — | [NECESITA ACLARACIÓN: ¿roles distintos? — por defecto: Tecnico, Comercial, Administrador (PA-06)] | — |
