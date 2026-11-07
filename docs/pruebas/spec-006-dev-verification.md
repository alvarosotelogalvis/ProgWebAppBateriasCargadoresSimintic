# T026: Verificación Spec 006 en DEV

**Estado**: Pendiente verificación en DEV real (SharePoint + Azure)

## Checklist de aceptación (Spec 006)

### HU-006-1: Ver servicios de otros (P1)

- [ ] **ES-006-01**: Dispositivo A crea servicio RECIBIDO; B sincroniza → aparece "Sincronizado"
- [ ] **ES-006-02**: Servicio cerrado hace 2 meses → se descarga en primera sync
- [ ] **ES-006-03**: A modifica sin cambios locales de B → B obtiene valores nuevos en sync
- [ ] **ES-006-04**: Segunda sync solo trae cambios (delta incremental < 5s sin cambios remotos)
- [ ] **ES-006-05**: Admin agrega cliente → aparece en formularios de B post-sync

### HU-006-2: Conflictos (P1)

- [ ] **ES-006-06**: Cambios distintos en distintos campos → se combinan sin conflicto
- [ ] **ES-006-07**: Mismo campo cambiado por ambos → conflicto, no se sube
- [ ] **ES-006-08**: Pantalla de resolución muestra quién/cuándo (fields.Editor)
- [ ] **ES-006-09**: Resolver → pending → reintento de push en siguiente sync
- [ ] **ES-006-10**: Mismo valor en ambos lados → sin conflicto
- [ ] **ES-006-11**: Estado más avanzado gana; incoherencia → conflicto
- [ ] **ES-006-12**: Conflicto sin resolver + cambios offline → no pierde datos

### HU-006-3: Adjuntos remotos (P2)

- [ ] **ES-006-13**: Sync descarga ≤50 miniaturas cuando está activado
- [ ] **ES-006-14**: PhotoGallery muestra adjuntos remotos con badge "En SharePoint"
- [ ] **ES-006-15**: Link "Abrir en SharePoint" funciona con red; deshabilitado sin red

## Ambiente DEV

- SharePoint sitio: `https://dev.sharepoint.com/sites/servicio-tecnico`
- Lista Servicios con estructura de campos
- Usuarios: 2 técnicos para simular concurrencia

## Protocolo

1. Registrar sesión en `docs/pruebas/log-dev-006.md` (fecha, usuario, escenario, resultado)
2. Captura de pantalla de cada criterio ✅/❌
3. Errores → crear issue en GitHub con contexto
