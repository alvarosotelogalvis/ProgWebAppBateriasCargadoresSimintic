# T042 — Prueba DEV Real de Spec 007

**Objetivo**: Verificar que un servicio completo puede atravesar todas las etapas en sincronización real con SharePoint DEV.

**Ambiente**: DEV (App Registration + SharePoint Site DEV)
**Duración estimada**: 30 minutos
**Dispositivos**: 2 (móvil + desktop recomendado)

## Escenario 1: Flujo Completo (Técnico → Comercial → Técnico → Comercial)

### Setup

1. Dispositivo 1: Técnico autenticado (MSAL)
2. Dispositivo 2: Comercial autenticado (MSAL)
3. WiFi + conectividad = SI (para sincronización)

### Pasos

#### Fase 1: Técnico crea y diagnostica

1. **Dev1 (Técnico)**: Crear nuevo servicio (tipo, cliente, serie)
2. **Verify**: Servicio en BORRADOR local
3. **Dev1 (Técnico)**: Completar diagnóstico
   - Diagnóstico: "Reparable"
   - Observación: "Batería descargada, sin daño físico"
   - Adjuntar PDF de diagnóstico
4. **Verify**: Estado = DIAGNOSTICADO, syncState = pending
5. **Dev1 (Técnico)**: Sincronizar (conectar)
6. **Verify SP**: Servicio aparece en lista SharePoint como DIAGNOSTICADO

#### Fase 2: Comercial cotiza

1. **Dev2 (Comercial)**: Descargar/sincronizar desde SharePoint
2. **Verify Dev2**: Servicio aparece con estado DIAGNOSTICADO
3. **Dev2 (Comercial)**: Completar cotización
   - Fecha: hoy
   - Valor: $1.250.000
   - Respuesta: APROBADA
4. **Verify Dev2**: Estado = COTIZADO
5. **Dev2 (Comercial)**: Sincronizar
6. **Verify SP**: Cotización guardada en SharePoint
7. **Verify Dev1**: Dev1 recibe actualización en vivo (live query)

#### Fase 3: Técnico crea OT y entrega

1. **Dev1 (Técnico)**: Sincronizar/descargar cambios
2. **Verify Dev1**: Cotización aparece con APROBADA
3. **Dev1 (Técnico)**: Crear OT
   - Detalle: "Cambiar batería, calibrar, pruebas"
   - Costo: $500.000
4. **Verify Dev1**: Estado = EN_REPARACION
5. **Dev1 (Técnico)**: Completar entrega
   - Fecha: hoy
   - Fotos: 2 de salida
   - Vida útil: +12 meses
6. **Verify Dev1**: Estado = ENTREGADO
7. **Dev1 (Técnico)**: Sincronizar

#### Fase 4: Comercial factura

1. **Dev2 (Comercial)**: Descargar cambios
2. **Verify Dev2**: Servicio en ENTREGADO
3. **Dev2 (Comercial)**: Completar facturación
   - PDF: factura (cualquier PDF válido)
   - Fecha: hoy
   - Número: FE-2026-001234
4. **Verify Dev2**: Estado = FACTURADO
5. **Dev2 (Comercial)**: Sincronizar
6. **Verify SP**: Servicio final en FACTURADO
7. **Verify Dev1**: Dev1 recibe actualización

### Resultado esperado

✅ Servicio completado: BORRADOR → RECIBIDO → DIAGNOSTICADO → COTIZADO → EN_REPARACION → ENTREGADO → FACTURADO

---

## Escenario 2: Disposición Final

**Pasos resumidos**:

1. Técnico: Diagnóstico = "D. FINAL" + PDF socializacion
2. **Verify**: Estado = DISPOSICION_FINAL (cerrado, sin más etapas)
3. Sincronizar
4. **Verify SP**: Aparece como DISPOSICION_FINAL

---

## Checklist de Aceptación

- [ ] Servicio recorre todas las etapas
- [ ] Sincronización funciona en ambas direcciones (push/pull)
- [ ] Live queries actualizan en vivo entre dispositivos
- [ ] PDFs se guardan y se pueden descargar
- [ ] Validaciones de fechas funcionan
- [ ] Sin pérdida de datos
- [ ] Sin errores en consola
- [ ] Tiempos de sincronización < 5 seg/etapa

---

**Fecha de prueba**: ___________
**Ejecutado por**: ___________
**Resultado**: ✅ PASS / ❌ FAIL
**Observaciones**:
