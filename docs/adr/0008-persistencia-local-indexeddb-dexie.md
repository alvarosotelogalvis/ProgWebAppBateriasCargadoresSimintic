# ADR-0008 — Persistencia local en IndexedDB con Dexie (registros y archivos)

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `01-Comun` §4 (motor de BD, BD híbrida local/remota), `05-App-Movil.md` §4 (persistencia local offline)

## Contexto

Se guardan registros estructurados y **archivos binarios** (fotos y PDFs, varios MB) durante días sin conexión, en navegadores de Android, iOS y escritorio.

## Opciones consideradas

1. **IndexedDB con Dexie**. Pros: guarda `Blob` directamente, transacciones, índices, consultas reactivas (`liveQuery`), migraciones versionadas y soporte en todos los navegadores objetivo. Contras: cuota sujeta al navegador.
2. **localStorage**. ❌ ~5 MB, solo texto y síncrono.
3. **OPFS (Origin Private File System) para archivos + IndexedDB para metadatos**. Pros: eficiente con archivos grandes. Contras: dos sistemas que mantener coherentes, más complejidad y soporte más reciente en Safari.
4. **SQLite WASM (wa-sqlite / sql.js) sobre OPFS**. Contras: peso, complejidad y requisitos de cabeceras COOP/COEP.

## Decisión

**Dexie 4 sobre IndexedDB** para todo (registros, adjuntos como `Blob`, catálogos, metadatos y logs), con el esquema de SDD §6.1. Mitigaciones de almacenamiento:

- `navigator.storage.persist()` en la configuración inicial.
- Monitoreo con `storage.estimate()`: aviso al 80 % y bloqueo de capturas al 95 %.
- Purga segura de originales ya sincronizados (`RetencionOriginalesDias`) y de cerrados antiguos (`RetencionCerradosMeses`).
- Instalación obligatoria en iOS (InstallGate) y respaldo ZIP manual.

## Consecuencias

- **Positivas**: una sola tecnología y fácil de probar (`fake-indexeddb`).
- **Negativas**: si el usuario borra los datos del navegador, se pierde lo no sincronizado.
- **Regla dura**: ninguna migración ni purga elimina datos con `syncState ≠ synced` (prueba T-08).
- **Datos sin cifrado a nivel app**: ver ADR-0018.

## Cumplimiento / verificación

Pruebas T-06, T-07 y T-08. Spike S5 (iOS).

## Referencias

- SDD §6
