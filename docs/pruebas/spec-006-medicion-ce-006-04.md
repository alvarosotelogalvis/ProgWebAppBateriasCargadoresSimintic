# T027: Medición CE-006-04

**Criterio**: Sync incremental sin cambios remotos termina en < 5s

## Protocolo de medición

```typescript
// En SyncEngine.ts, registrar timestamps
const t0 = performance.now();

// Inicio de pull (después del push)
const t1 = performance.now();
const resultadoPull = await pullServicios(...);

// Fin del pull
const t2 = performance.now();

const tiempoPull = t2 - t1;
logger.info('CE-006-04', `Pull sin cambios: ${tiempoPull}ms`);

// Guardar en bitácora
await meta.registrar({
  evento: 'CE-006-04-pull-incremental',
  tiempoMs: tiempoPull,
  sincronizacionId: correlationId,
  cambios: resultadoPull,
});

// Verificar < 5000ms
if (tiempoPull > 5000) {
  logger.warn('CE-006-04', `LENTO: ${tiempoPull}ms (umbral: 5000ms)`);
}
```

## Ejecución en DEV

1. **Setup**: Sync inicial normal
2. **Sin cambios remotos**: Esperar 1 minuto
3. **Pull incremental**: Medir tiempo
4. **Repetir**: 5 veces, promediar

## Resultado esperado

- Promedio < 5s (sin cambios remotos)
- Incremental es más rápido que primera descarga
- Anotar resultado en spec §8

## Nota

Si > 5s, revisar:

- Paginación delta
- Tamaño de página (actual: 200)
- Llamadas paralelas a Graph
