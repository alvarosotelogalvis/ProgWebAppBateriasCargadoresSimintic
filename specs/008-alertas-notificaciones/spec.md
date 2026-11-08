# Spec 008 — Alertas de vida útil y notificaciones

- **Estado**: Aprobada
- **Fecha**: 2026-10-21 · **Rama**: `feature/008-alertas-notificaciones`
- **Fase**: F8 (`docs/07`) · **Depende de**: 007 (etapas: OT y entrega con vida útil)
- **Fuentes**: PRD [HU-06, HU-12; RF-14, RF-15; O5] · ADR [0013]

## 1. Resumen

Dos partes: (1) sección de alertas en la app que muestra equipos cuya vida útil está vencida o próxima; (2) automatización en Power Automate para correos de OT y alertas diarias.

## 2. Historias de usuario

### HU-008-1 — Ver alertas en la app (P1) 🎯

Como comercial quiero ver equipos por terminar su vida útil, para contactar al cliente a tiempo.

- **ES-008-01**: Pestañas Vencidas, ≤30 días, ≤60 días, ≤90 días con contador
- **ES-008-02**: Cada equipo en una única pestaña (umbral más próximo)
- **ES-008-03**: Vencidas muestran "Venció hace N días"
- **ES-008-04**: Filtro por cliente persiste al cambiar pestaña
- **ES-008-05**: Tocar fila abre detalle del servicio
- **ES-008-06**: Excluyen anulados, DF, sin proyección
- **ES-008-07**: Funciona offline
- **ES-008-08**: Umbrales actualizables desde configuración

### HU-008-2 — Resumen en Inicio (P2)

Como usuario quiero ver si hay alertas en Inicio.

- **ES-008-09**: Tarjeta "Alertas: Vencidas N · ≤30 días M"
- **ES-008-10**: "Sin alertas" si no hay

### HU-008-3 — Correo OT (P1)

Como responsable de taller quiero correo al generar OT.

- **ES-008-11**: Un correo por servicio al llegar a En reparación
- **ES-008-12**: Sin duplicados (indicador de envío)
- **ES-008-13**: Aviso de fallo al responsable

### HU-008-4 — Correo diario alertas (P1)

Como comercial quiero resumen diario de vida útil.

- **ES-008-14**: Correo 07:00 CO con tabla (código, cliente, serie, fecha, días, nivel)
- **ES-008-15**: Sin repetir mismo nivel
- **ES-008-16**: Sin correo si ninguno cambió

### HU-008-5 — Responsabilidades claras (P1)

Como coordinador quiero que indicadores de correo sean exclusivos de automatización.

- **ES-008-17**: App nunca modifica indicadores de correo/nivel
- **ES-008-18**: App conserva indicadores como solo lectura

## 3. Aclaraciones (confirmadas)

| Pregunta                                 | Respuesta                                           |
| ---------------------------------------- | --------------------------------------------------- |
| PA-04: ¿Quién recibe correo de OT?       | Dirección/lista configurada como destino OT         |
| PA-05: ¿Quién recibe alertas y umbrales? | Dirección/lista de alertas; 90/60/30 días + vencida |

## 4. Fuera de alcance

- Notificaciones push en dispositivo
- Correos al cliente final
- Edición de destinatarios desde app

---

**Criterios de éxito**:

- CE-008-01: 100% de equipos entregados con proyección recibe alerta por correo
- CE-008-02: 0 correos OT duplicados
- CE-008-03: Correo llega en ≤10 min post-sync
- CE-008-04: Alertas abre en <1 seg con 500 servicios
