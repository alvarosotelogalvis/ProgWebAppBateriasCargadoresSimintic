# Spec 011 — Número de solicitud automático

- **Estado**: Implementada
- **Fecha**: 2026-11-16 · **Rama**: `feature/011-numero-solicitud-automatico`
- **Fase**: posterior a F10 (cambio solicitado por el dueño del producto) · **Depende de**: 003, 005, 006
- **Fuentes**: PRD [RF-06, RF-12; PA-07] · ADR [0024, 0010] · Modelo de datos [§2.2] · Spec 003 [FR-003-03]

> Describe **qué** y **por qué**. Sin tecnologías ni nombres de archivos de código (eso va en `plan.md`).

## 1. Resumen

El número de solicitud deja de digitarse. Lo asigna el sistema al sincronizar: se consulta el último número usado y se da el siguiente. El técnico captura menos datos y la numeración es consecutiva y sin errores.

## 2. Historias de usuario

### HU-011-1 — El número se asigna solo al sincronizar (Prioridad P1) 🎯

Como **técnico** quiero no tener que escribir el número de solicitud, para registrar más rápido y sin equivocarme.
**Por qué P1**: es un dato que hoy se digita a mano y puede repetirse o equivocarse.
**Prueba independiente**: registrar un servicio sin conexión (sin número), sincronizar y comprobar que recibe el siguiente número consecutivo.

**Escenarios de aceptación**

- **ES-011-01** — **Dado** el formulario de recepción, **cuando** el técnico lo abre, **entonces** no hay campo de número de solicitud y el servicio guardado muestra «Pendiente».
- **ES-011-02** — **Dado** que el último número en SharePoint es 41, **cuando** un servicio se sincroniza, **entonces** recibe el 42 y su código pasa de `BAT-PEND-NV4520` a `BAT-42-NV4520`.
- **ES-011-03** — **Dado** que no hay servicios en SharePoint, **cuando** se sincroniza el primero, **entonces** recibe el 1.
- **ES-011-04** — **Dado** dos servicios pendientes en el mismo dispositivo, **cuando** se sincronizan, **entonces** reciben números distintos y consecutivos, en el orden en que se registraron.
- **ES-011-05** — **Dado** dos dispositivos que sincronizan a la vez, **cuando** ambos leen el mismo último número, **entonces** no se repite ningún número: uno recibe el siguiente y el otro el posterior.
- **ES-011-06** — **Dado** una sincronización cortada después de asignar el número, **cuando** se reintenta, **entonces** el servicio conserva el mismo número y no se consume uno nuevo.
- **ES-011-07** — **Dado** servicios existentes con número digitado antes del cambio, **cuando** se sincroniza uno nuevo, **entonces** continúa desde el mayor de ellos y los existentes no cambian.
- **ES-011-08** — **Dado** un servicio ya sincronizado, **cuando** se abre su detalle, **entonces** el número aparece y no se puede editar desde la app.
- **ES-011-09** — **Dado** un servicio pendiente (sin número) que se busca por el código o por la serie, **cuando** el técnico escribe la serie, **entonces** lo encuentra.
- **ES-011-10** — **Dado** un servicio activo con la serie NV4520, **cuando** el técnico registra otro equipo con esa misma serie, **entonces** la app avisa que ya hay uno activo con esa serie (el aviso informa, no bloquea).

## 3. Casos borde

- Un servicio sin número no puede avanzar a etapas que dependan del número en documentos externos; las etapas internas de la app siguen funcionando (el número no es requisito de las etapas).
- Si SharePoint está inaccesible, el servicio queda «Pendiente» y se reintenta; el número nunca se inventa en el dispositivo.
- Se elimina en SharePoint el servicio con el número más alto: el siguiente servicio podría reutilizar ese número (se acepta y se documenta).
- Servicio con el mismo valor de número creado a mano en SharePoint durante la sincronización: se reintenta con el siguiente.

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                 | Traza   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FR-011-01 | No pedir el número de solicitud en el formulario y mostrarlo como «Pendiente» hasta sincronizar                                  | [RF-06] |
| FR-011-02 | Al subir un servicio nuevo, leer el mayor número existente en ese momento y asignar el siguiente (1 si no hay ninguno)           | [RF-12] |
| FR-011-03 | Asignar un número distinto a cada servicio, aun si comparten visita o cliente                                                    | [RF-12] |
| FR-011-04 | Garantizar que ningún número se repita aunque varios dispositivos sincronicen a la vez, reintentando con el siguiente disponible | [RF-12] |
| FR-011-05 | No reasignar el número a un servicio que ya lo tiene (reintentos idempotentes)                                                   | [RF-12] |
| FR-011-06 | Calcular el código visible con «PEND» mientras no hay número y recalcularlo al recibirlo                                         | [RF-06] |
| FR-011-07 | Conservar los números ya existentes y continuar desde el mayor                                                                   | [RF-12] |
| FR-011-08 | No permitir editar el número desde la app                                                                                        | [RF-06] |
| FR-011-09 | Seguir encontrando el servicio pendiente por serie, código y cliente en el buscador                                              | [RF-14] |
| FR-011-11 | Avisar (sin bloquear) si ya existe un servicio activo con la misma serie, porque sin número ya no se compara «serie + solicitud» | [RF-06] |
| FR-011-10 | Mantener textos externalizados, accesibilidad AA y funcionamiento sin conexión del registro                                      | [RNF]   |

## 5. Entidades clave

- **Servicio**: gana el estado «número pendiente» (sin número hasta sincronizar). El número, una vez asignado, es único en toda la lista.

## 6. Criterios de éxito

- **CE-011-01**: con 2 dispositivos sincronizando 20 servicios cada uno a la vez, los 40 números son únicos y consecutivos.
- **CE-011-02**: repetir una sincronización cortada nunca cambia el número ya asignado.
- **CE-011-03**: registrar un servicio no exige red ni un dato menos que antes (un campo menos).

## 7. Fuera de alcance

- Agrupar varios equipos bajo un mismo número de solicitud.
- Reasignar o renumerar servicios ya sincronizados desde la app.
- Prefijos por año o por cliente en el número.

## 8. Aclaraciones

| Fecha      | Pregunta                               | Respuesta                                                                                   |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2026-11-16 | ¿Cómo debe ser el número de solicitud? | Automático: al subir, leer en qué número va y asignar el próximo. El técnico no lo ingresa. |
