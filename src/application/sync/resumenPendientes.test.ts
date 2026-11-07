import { afterEach, describe, expect, it } from 'vitest';

import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';

import { calcularResumenPendientes } from './resumenPendientes';

const cerrar: Array<() => Promise<void>> = [];
afterEach(async () => {
  const pendientes = cerrar.splice(0);
  await Promise.all(pendientes.map((fn) => fn()));
});

async function crearRepositorios() {
  const db = await crearDbPrueba();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  cerrar.push(async () => {
    await db.delete();
  });
  return { servicios, adjuntos };
}

describe('calcularResumenPendientes', () => {
  it('cuenta servicios, archivos y tamaño de lo pendiente', async () => {
    const { servicios, adjuntos } = await crearRepositorios();
    const uno = servicioBuilder().conId('s-1').pendiente().construir();
    const dos = servicioBuilder().conId('s-2').pendiente().construir();
    await servicios.guardar(uno);
    await servicios.guardar(dos);

    await adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('s-1')
        .conCampos({ id: 'a-1', syncState: 'pending', tamanoBytes: 1000 })
        .construir()
    );
    await adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('s-1')
        .conCampos({ id: 'a-2', syncState: 'error', tamanoBytes: 2000 })
        .construir()
    );
    await adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('s-2')
        .conCampos({ id: 'a-3', syncState: 'synced', tamanoBytes: 9999 })
        .construir()
    );
    await adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('s-2')
        .conCampos({
          id: 'a-4',
          syncState: 'synced',
          eliminarRemoto: true,
          tamanoBytes: 5000,
        })
        .construir()
    );

    const resumen = await calcularResumenPendientes({ servicios, adjuntos });

    expect(resumen).toMatchObject({
      servicios: 2,
      archivos: 3,
      bytes: 3000,
    });
    expect(resumen.porServicio).toEqual([
      { servicioId: 's-1', codigo: uno.codigo, archivos: 2, bytes: 3000 },
      { servicioId: 's-2', codigo: dos.codigo, archivos: 1, bytes: 0 },
    ]);
  });

  it('ignora borradores y servicios ya sincronizados', async () => {
    const { servicios, adjuntos } = await crearRepositorios();
    await servicios.guardar(servicioBuilder().conId('borrador').borrador().construir());
    await servicios.guardar(servicioBuilder().conId('listo').sincronizado().construir());
    const pendiente = servicioBuilder().conId('pendiente').pendiente().construir();
    await servicios.guardar(pendiente);
    await adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('borrador')
        .conCampos({ id: 'a-b', syncState: 'pending' })
        .construir()
    );
    await adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('pendiente')
        .conCampos({ id: 'a-p', syncState: 'pending', tamanoBytes: 42 })
        .construir()
    );

    const resumen = await calcularResumenPendientes({ servicios, adjuntos });

    expect(resumen).toMatchObject({ servicios: 1, archivos: 1, bytes: 42 });
    expect(resumen.porServicio.map((item) => item.servicioId)).toEqual(['pendiente']);
  });

  it('ordena por actualizadoEn ascendente, igual que el motor', async () => {
    const { servicios, adjuntos } = await crearRepositorios();
    const crear = (id: string, actualizadoEn: string) => ({
      ...servicioBuilder().conId(id).pendiente().construir(),
      actualizadoEn,
    });
    await servicios.guardar(crear('z-reciente', '2026-11-06T10:00:00.000Z'));
    await servicios.guardar(crear('a-antiguo', '2026-11-01T10:00:00.000Z'));

    const resumen = await calcularResumenPendientes({ servicios, adjuntos });

    expect(resumen.porServicio.map((s) => s.servicioId)).toEqual(['a-antiguo', 'z-reciente']);
  });
});
