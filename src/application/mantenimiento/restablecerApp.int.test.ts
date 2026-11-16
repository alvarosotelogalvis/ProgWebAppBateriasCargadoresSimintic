import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AppDB } from '@/infrastructure/db/dexie';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { ErrorRestablecimiento, restablecerApp } from './restablecerApp';
import { depsMantenimiento } from '@/features/tecnico/depsMantenimiento';

let db: AppDB;

beforeEach(async () => {
  db = await crearDbPrueba();
});

afterEach(async () => {
  await db.delete();
});

describe('restablecerApp', () => {
  it('borra servicios, adjuntos y logs cuando todo está sincronizado', async () => {
    await db.servicios.add(servicioBuilder().conId('s1').facturado().sincronizado().construir());
    await db.adjuntos.add(
      adjuntoBuilder().enServicio('s1').conCampos({ syncState: 'synced' }).construir()
    );

    const resultado = await restablecerApp(depsMantenimiento(db).restablecer);

    expect(resultado).toMatchObject({ serviciosEliminados: 1, adjuntosEliminados: 1 });
    expect(await db.servicios.count()).toBe(0);
    expect(await db.adjuntos.count()).toBe(0);
  });

  it.each(['pending', 'error', 'conflict', 'local', 'syncing'] as const)(
    'nunca restablece con un servicio en estado %s',
    async (syncState) => {
      await db.servicios.add({
        ...servicioBuilder().conId('s1').recibido().construir(),
        syncState,
      });

      await expect(restablecerApp(depsMantenimiento(db).restablecer)).rejects.toBeInstanceOf(
        ErrorRestablecimiento
      );
      expect(await db.servicios.count()).toBe(1);
    }
  );

  it('nunca restablece con un adjunto sin subir o con una eliminación pendiente', async () => {
    await db.servicios.add(servicioBuilder().conId('s1').recibido().sincronizado().construir());
    await db.adjuntos.add(
      adjuntoBuilder().enServicio('s1').conCampos({ syncState: 'pending' }).construir()
    );

    await expect(restablecerApp(depsMantenimiento(db).restablecer)).rejects.toBeInstanceOf(
      ErrorRestablecimiento
    );
    expect(await db.adjuntos.count()).toBe(1);

    await db.adjuntos.clear();
    await db.adjuntos.add(
      adjuntoBuilder()
        .enServicio('s1')
        .conCampos({ syncState: 'synced', eliminarRemoto: true })
        .construir()
    );
    await expect(restablecerApp(depsMantenimiento(db).restablecer)).rejects.toBeInstanceOf(
      ErrorRestablecimiento
    );
  });
});
