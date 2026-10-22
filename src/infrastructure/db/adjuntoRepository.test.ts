import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { AdjuntoRepositoryDexie } from './adjuntoRepository';
import type { AppDB } from './dexie';

let db: AppDB;
let repo: AdjuntoRepositoryDexie;

beforeEach(async () => {
  db = await crearDbPrueba();
  repo = new AdjuntoRepositoryDexie(db);
});

afterEach(async () => {
  await db.delete();
});

describe('AdjuntoRepositoryDexie', () => {
  it('guarda, recupera y lista por servicio', async () => {
    const uno = adjuntoBuilder({ id: 'a1', servicioId: 's1' }).construir();
    const dos = adjuntoBuilder({ id: 'a2', servicioId: 's1' }).construir();
    const otro = adjuntoBuilder({ id: 'a3', servicioId: 's2' }).construir();
    await repo.guardar(uno);
    await repo.guardar(dos);
    await repo.guardar(otro);

    expect((await repo.obtener('a1'))?.id).toBe(uno.id);
    expect((await repo.obtener('a1'))?.sha256).toBe(uno.sha256);
    expect((await repo.listarPorServicio('s1')).map((adjunto) => adjunto.id).sort()).toEqual([
      'a1',
      'a2',
    ]);
    expect(await repo.listarPorServicio('no-existe')).toEqual([]);
  });

  it('busca por servicio, tipo y hash', async () => {
    const objetivo = adjuntoBuilder({ id: 'a1', servicioId: 's1', sha256: 'b'.repeat(64) })
      .deTipo('FORMATO_DIAGNOSTICO')
      .construir();
    await repo.guardar(objetivo);
    await repo.guardar(
      adjuntoBuilder({ id: 'a2', servicioId: 's1', sha256: 'c'.repeat(64) })
        .deTipo('FORMATO_DIAGNOSTICO')
        .construir()
    );

    expect((await repo.buscarPorHash('s1', 'FORMATO_DIAGNOSTICO', 'b'.repeat(64)))?.id).toBe(
      objetivo.id
    );
    expect(await repo.buscarPorHash('s1', 'FORMATO_DIAGNOSTICO', 'd'.repeat(64))).toBeUndefined();
  });

  it('marca como pendientes solo los adjuntos locales del servicio', async () => {
    const local1 = adjuntoBuilder({ id: 'l1', servicioId: 's1' }).construir();
    const local2 = adjuntoBuilder({ id: 'l2', servicioId: 's1' }).construir();
    const sincronizado = adjuntoBuilder({ id: 'z1', servicioId: 's1' }).sincronizado().construir();
    const otro = adjuntoBuilder({ id: 'o1', servicioId: 's2' }).construir();
    await db.adjuntos.bulkPut([local1, local2, sincronizado, otro]);

    expect(await repo.marcarPendientes('s1')).toBe(2);
    expect((await repo.obtener('l1'))?.syncState).toBe('pending');
    expect((await repo.obtener('l2'))?.syncState).toBe('pending');
    expect((await repo.obtener('z1'))?.syncState).toBe('synced');
    expect((await repo.obtener('o1'))?.syncState).toBe('local');
    expect(await repo.marcarPendientes('s1')).toBe(0);
  });

  it('elimina los adjuntos de un servicio y devuelve la cantidad', async () => {
    await db.adjuntos.bulkPut([
      adjuntoBuilder({ id: 'a1', servicioId: 's1' }).construir(),
      adjuntoBuilder({ id: 'a2', servicioId: 's1' }).construir(),
      adjuntoBuilder({ id: 'a3', servicioId: 's2' }).construir(),
    ]);

    expect(await repo.eliminarPorServicio('s1')).toBe(2);
    expect(await repo.listarPorServicio('s1')).toEqual([]);
    expect(await repo.obtener('a3')).toBeDefined();
  });

  it('purga el blob original de adjuntos sincronizados antiguos sin tocar la miniatura', async () => {
    const viejo = adjuntoBuilder({ id: 'viejo', servicioId: 's1' })
      .sincronizado('2026-01-01T00:00:00.000Z')
      .construir();
    const reciente = adjuntoBuilder({ id: 'reciente', servicioId: 's1' })
      .sincronizado('2026-12-01T00:00:00.000Z')
      .construir();
    const pendiente = adjuntoBuilder({ id: 'pendiente', servicioId: 's1' }).construir();
    const sinBlob = adjuntoBuilder({ id: 'sin-blob', servicioId: 's1' })
      .sincronizado('2026-01-01T00:00:00.000Z')
      .sinBlob()
      .construir();
    await db.adjuntos.bulkPut([viejo, reciente, pendiente, sinBlob]);

    expect(await repo.purgarOriginales('2026-10-01')).toBe(1);
    const purgado = await repo.obtener('viejo');
    expect(purgado?.blob).toBeNull();
    expect(purgado?.miniatura).not.toBeNull();
    expect((await repo.obtener('reciente'))?.blob).not.toBeNull();
    expect((await repo.obtener('pendiente'))?.blob).not.toBeNull();
    expect((await repo.obtener('sin-blob'))?.blob).toBeNull();
  });

  it('elimina un adjunto local por id', async () => {
    await repo.guardar(adjuntoBuilder({ id: 'a1' }).construir());
    await repo.eliminarLocal('a1');
    expect(await repo.obtener('a1')).toBeUndefined();
  });
});
