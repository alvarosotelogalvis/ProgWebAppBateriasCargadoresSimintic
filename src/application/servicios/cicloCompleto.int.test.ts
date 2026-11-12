import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import type { TipoAdjunto } from '@/domain/servicio';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { crearCasosDeUso } from './casosDeUso';

let db: AppDB;
let servicios: ServicioRepositoryDexie;
let adjuntos: AdjuntoRepositoryDexie;
let casos: ReturnType<typeof crearCasosDeUso>;

beforeEach(async () => {
  db = await crearDbPrueba();
  servicios = new ServicioRepositoryDexie(db);
  adjuntos = new AdjuntoRepositoryDexie(db);
  const ids = new FakeIdGenerator();
  casos = crearCasosDeUso({
    servicios,
    adjuntos,
    uow: new UnidadDeTrabajoDexie(db, servicios, adjuntos),
    ids,
    clock: new FakeClock(),
    auth: new FakeAuth(),
    logger: new FakeLogger(),
    meta: new MetaRepositoryDexie(db, ids),
    config: () => CONFIG_DEFECTO,
    appVersion: 'test',
  });
});

afterEach(async () => {
  await db.delete();
});

const adjuntar = (servicioId: string, tipo: TipoAdjunto, id: string) =>
  adjuntos.guardar(adjuntoBuilder({ id, servicioId, tipo, syncState: 'pending' }).construir());

describe('ciclo completo de un servicio (punto de control spec 007)', () => {
  it('RECIBIDO → FACTURADO cambiando de rol, con la ruta de reparación', async () => {
    const inicial = servicioBuilder().recibido().construir();
    await servicios.guardar(inicial);
    const { id } = inicial;
    const tecnico = ['Tecnico'] as const;
    const comercial = ['Comercial'] as const;

    // Técnico: diagnóstico
    await casos.actualizarCampos(
      id,
      { diagnostico: 'Reparable', observacionTecnica: 'Celdas con desbalance' },
      tecnico
    );
    await adjuntar(id, 'FORMATO_DIAGNOSTICO', 'fd');
    expect((await casos.completarEtapa(id, 'completarDiagnostico', tecnico)).estado).toBe(
      'DIAGNOSTICADO'
    );

    // Comercial: cotización y respuesta
    await casos.actualizarCampos(
      id,
      { cotizacionFechaEnvio: '2026-10-10', cotizacionValor: 1500000 },
      comercial
    );
    expect((await casos.completarEtapa(id, 'registrarCotizacion', comercial)).estado).toBe(
      'COTIZADO'
    );
    await casos.cambiarRespuestaCotizacion(id, 'APROBADA', comercial);

    // Técnico: orden de trabajo y entrega
    await casos.actualizarCampos(
      id,
      { otDetalle: 'Cambio de celdas y prueba', otCostoReparacion: 350000 },
      tecnico
    );
    expect((await casos.completarEtapa(id, 'generarOT', tecnico)).estado).toBe('EN_REPARACION');
    await casos.actualizarCampos(
      id,
      { fechaEntrega: '2026-10-20', proyeccionVidaUtil: '2027-10-20' },
      tecnico
    );
    await adjuntar(id, 'FOTO_SALIDA', 'fs');
    expect((await casos.completarEtapa(id, 'registrarEntrega', tecnico)).estado).toBe('ENTREGADO');

    // Comercial: facturación
    await casos.actualizarCampos(
      id,
      { facturaFecha: '2026-10-25', facturaNumero: 'FE-2026-001234' },
      comercial
    );
    await adjuntar(id, 'FACTURA', 'fac');
    const final = await casos.completarEtapa(id, 'registrarFacturacion', comercial);

    expect(final.estado).toBe('FACTURADO');
    expect(final).toMatchObject({
      cotizacionEstado: 'APROBADA',
      otCostoReparacion: 350000,
      facturaNumero: 'FE-2026-001234',
      syncState: 'pending',
    });
    expect(final.camposSucios).toEqual(
      expect.arrayContaining([
        'estado',
        'diagnostico',
        'cotizacionValor',
        'otDetalle',
        'facturaFecha',
      ])
    );
  });

  it('ruta sin reparación: cotización rechazada → entrega sin orden de trabajo → facturación', async () => {
    const inicial = servicioBuilder().cotizado().construir();
    await servicios.guardar(inicial);
    const { id } = inicial;

    await casos.cambiarRespuestaCotizacion(id, 'RECHAZADA', ['Comercial']);
    await casos.actualizarCampos(id, { fechaEntrega: '2026-10-20' }, ['Tecnico']);
    await adjuntar(id, 'FOTO_SALIDA', 'fs');
    const entregado = await casos.completarEtapa(id, 'registrarEntregaSinReparacion', ['Tecnico']);

    expect(entregado.estado).toBe('ENTREGADO');
    expect(entregado.proyeccionVidaUtil).toBeUndefined();
  });

  it('el Técnico no puede cotizar ni facturar; el Comercial no puede generar la OT', async () => {
    const diagnosticado = servicioBuilder().diagnosticado().construir();
    await servicios.guardar(diagnosticado);

    await expect(
      casos.completarEtapa(diagnosticado.id, 'registrarCotizacion', ['Tecnico'])
    ).rejects.toThrow();

    const cotizado = servicioBuilder().cotizado().conId('otro').construir();
    await servicios.guardar({ ...cotizado, cotizacionEstado: 'APROBADA' });
    await expect(casos.completarEtapa('otro', 'generarOT', ['Comercial'])).rejects.toThrow();
  });
});
