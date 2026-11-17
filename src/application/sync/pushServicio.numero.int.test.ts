import { describe, expect, it } from 'vitest';

import type { RemoteGatewayPush, ServicioRemotoPush } from '@/application/ports/RemoteGatewayPush';
import type { Uploader } from '@/application/ports/UploaderPort';
import type { Servicio } from '@/domain/servicio';
import { VALOR_TIPO_ADJUNTO } from '@/infrastructure/graph/mappers/choices';
import { aCamposSP, deCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';
import { AppError } from '@/shared/errors';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { adjuntoPendiente } from '../../../tests/fixtures/sync/crearEntornoSync';
import { pushServicio } from './pushServicio';

/**
 * Asignación del número de solicitud al subir un servicio nuevo (ADR-0024, spec 011).
 * Remoto en memoria: permite provocar las carreras entre dispositivos de forma determinista.
 */
interface ItemFalso {
  id: string;
  fields: Record<string, unknown>;
}

const duplicado = (): AppError =>
  new AppError({
    codigo: 'SP_NUMERO_DUPLICADO',
    mensaje: 'El número de solicitud ya existe.',
    reintentable: true,
    estadoHttp: 400,
  });

class RemotoFalso {
  readonly items: ItemFalso[] = [];
  private secuencia = 100;
  llamadasMaximo = 0;
  creaciones = 0;
  /** Si es true, un número repetido se rechaza (la unicidad ya llegó). */
  unicidadActiva = true;
  /** Se ejecuta justo antes de crear (otro dispositivo se adelanta). */
  antesDeCrear: ((remoto: RemotoFalso) => void) | undefined;
  /** Se ejecuta justo después de crear (otro dispositivo llega después). */
  despuesDeCrear: ((remoto: RemotoFalso) => void) | undefined;
  /** Se ejecuta justo antes de renumerar (otro dispositivo toma ese número con un id menor). */
  antesDeRenumerar: ((remoto: RemotoFalso, numero: number) => void) | undefined;
  /** Cantidad de creaciones que fallan por número duplicado antes de aceptar. */
  rechazosPorDuplicado = 0;

  agregar(fields: Record<string, unknown>, id?: string): ItemFalso {
    this.secuencia += 1;
    const item = { id: id ?? String(this.secuencia), fields: { ...fields } };
    this.items.push(item);
    return item;
  }

  private numeros(): number[] {
    return this.items.map((item) => Number(item.fields.NumeroSolicitud ?? 0));
  }

  asRemoto(): RemoteGatewayPush {
    const aRemoto = (item: ItemFalso): ServicioRemotoPush => ({
      id: item.id,
      fields: item.fields,
      eTag: `"${item.id}"`,
    });
    const remoto = {
      buscarServicioPorId: async (servicioId: string) => {
        const encontrado = this.items.find((item) => item.fields.ServicioId === servicioId);
        return encontrado ? aRemoto(encontrado) : null;
      },
      ultimoNumeroSolicitud: async () => {
        this.llamadasMaximo += 1;
        return Math.max(0, ...this.numeros());
      },
      crearServicio: async (campos: Record<string, unknown>) => {
        this.antesDeCrear?.(this);
        this.creaciones += 1;
        const numero = Number(campos.NumeroSolicitud ?? 0);
        if (this.rechazosPorDuplicado > 0) {
          this.rechazosPorDuplicado -= 1;
          throw duplicado();
        }
        if (this.unicidadActiva && numero > 0 && this.numeros().includes(numero)) {
          throw duplicado();
        }
        const item = this.agregar(campos);
        this.despuesDeCrear?.(this);
        return aRemoto(item);
      },
      contarPorNumeroSolicitud: async (numero: number) =>
        this.items
          .filter((item) => Number(item.fields.NumeroSolicitud) === numero)
          .map((item) => ({ itemId: item.id })),
      renumerarServicio: async (itemId: string, numero: number, codigo: string) => {
        this.antesDeRenumerar?.(this, numero);
        if (this.unicidadActiva && this.numeros().includes(numero)) throw duplicado();
        const item = this.items.find((candidato) => candidato.id === itemId);
        if (!item) throw new Error('ítem inexistente');
        item.fields.NumeroSolicitud = numero;
        item.fields.Title = codigo;
        return { eTag: `"renumerado-${numero}"` };
      },
      actualizarServicio: async () => ({ eTag: '"nuevo"' }),
      eliminarArchivo: async () => undefined,
      actualizarMetadatosArchivo: async () => undefined,
    };
    return remoto as unknown as RemoteGatewayPush;
  }
}

const ID = '00000000-0000-4000-8000-0000000000aa';

const nuevo = (campos: Partial<Servicio> = {}): Servicio => ({
  ...servicioBuilder()
    .conId(ID)
    .pendiente()
    .conCampos({ tipoEquipo: 'CARGADOR', serie: 'NV4520', numeroSolicitud: 0 })
    .construir(),
  codigo: 'CAR-PEND-NV4520',
  camposSucios: [],
  ...campos,
});

const uploaderQueGuarda = (rutas: string[]): Uploader => ({
  subir: async (_archivo, ruta) => {
    rutas.push(ruta);
    return { id: 'archivo-1', eTag: '"a"', webUrl: 'https://x/a' };
  },
});

const subir = (
  remoto: RemotoFalso,
  servicio: Servicio,
  opciones: {
    pausas?: number[];
    rutas?: string[];
    adjuntos?: ReturnType<typeof adjuntoPendiente>[];
  } = {}
) =>
  pushServicio(servicio, opciones.adjuntos ?? [], {
    remoto: remoto.asRemoto(),
    uploader: uploaderQueGuarda(opciones.rutas ?? []),
    mapeador: { aCamposSP, deCamposSP, valorTipoAdjunto: (tipo) => VALOR_TIPO_ADJUNTO[tipo] },
    ahoraIso: () => '2026-11-16T10:00:00.000Z',
    pausa: async (ms) => {
      opciones.pausas?.push(ms);
    },
    aleatorio: () => 0.5,
  });

describe('pushServicio · asignación del número de solicitud', () => {
  it('asigna el siguiente al mayor existente y crea el ítem con su código (ES-011-02)', async () => {
    const remoto = new RemotoFalso();
    remoto.agregar({ ServicioId: 'otro-1', NumeroSolicitud: 41 });

    const resultado = await subir(remoto, nuevo());

    expect(resultado.numeroSolicitud).toBe(42);
    const creado = remoto.items.find((item) => item.fields.ServicioId === ID);
    expect(creado?.fields).toMatchObject({ NumeroSolicitud: 42, Title: 'CAR-42-NV4520' });
  });

  it('empieza en 1 si no hay ningún servicio (ES-011-03)', async () => {
    const remoto = new RemotoFalso();

    const resultado = await subir(remoto, nuevo());

    expect(resultado.numeroSolicitud).toBe(1);
  });

  it('los archivos se nombran con el código ya numerado', async () => {
    const remoto = new RemotoFalso();
    remoto.agregar({ ServicioId: 'otro-1', NumeroSolicitud: 7 });
    const rutas: string[] = [];

    await subir(remoto, nuevo(), {
      rutas,
      adjuntos: [adjuntoPendiente(ID, '11111111-0000-4000-8000-000000000101')],
    });

    expect(rutas).toHaveLength(1);
    expect(rutas[0]).toContain('CAR-8-NV4520_FOTO_INGRESO_');
    expect(rutas[0]).not.toContain('PEND');
  });

  it('adopta el número del ítem que ya existe en SharePoint sin crear otro (ES-011-06)', async () => {
    const remoto = new RemotoFalso();
    remoto.agregar({ ServicioId: ID, NumeroSolicitud: 9, Title: 'CAR-9-NV4520' });

    const resultado = await subir(remoto, nuevo());

    expect(resultado.numeroSolicitud).toBe(9);
    expect(remoto.creaciones).toBe(0);
    expect(remoto.llamadasMaximo).toBe(0);
  });

  it('no reasigna ni consulta el máximo si el servicio ya tiene número', async () => {
    const remoto = new RemotoFalso();

    const resultado = await subir(remoto, nuevo({ numeroSolicitud: 5, codigo: 'CAR-5-NV4520' }));

    expect(remoto.llamadasMaximo).toBe(0);
    expect(resultado.numeroSolicitud).toBeUndefined();
    expect(remoto.items[0]?.fields.NumeroSolicitud).toBe(5);
  });

  it('un servicio que ya está en SharePoint (con itemId) no recibe número nuevo', async () => {
    const remoto = new RemotoFalso();
    const existente = nuevo({
      sp: { itemId: '55', eTag: '"1"', modificadoEn: '2026-11-01T00:00:00Z', webUrl: '' },
    });

    const resultado = await subir(remoto, existente);

    expect(remoto.llamadasMaximo).toBe(0);
    expect(remoto.creaciones).toBe(0);
    expect(resultado.numeroSolicitud).toBeUndefined();
  });
});

describe('pushServicio · choques entre dispositivos (ES-011-05)', () => {
  it('si el número ya lo tomó otro, vuelve a leer el máximo y reintenta con una pausa', async () => {
    const remoto = new RemotoFalso();
    remoto.agregar({ ServicioId: 'otro-1', NumeroSolicitud: 41 });
    remoto.rechazosPorDuplicado = 1;
    const pausas: number[] = [];

    const resultado = await subir(remoto, nuevo(), { pausas });

    expect(remoto.creaciones).toBe(2);
    expect(remoto.llamadasMaximo).toBe(2);
    expect(pausas).toHaveLength(1);
    expect(pausas[0]).toBeGreaterThanOrEqual(50);
    expect(pausas[0]).toBeLessThanOrEqual(350);
    expect(resultado.numeroSolicitud).toBe(42);
  });

  it('agota los intentos con un error reintentable y deja el servicio sin número', async () => {
    const remoto = new RemotoFalso();
    remoto.rechazosPorDuplicado = 99;

    const error = await subir(remoto, nuevo()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).reintentable).toBe(true);
    expect(remoto.creaciones).toBe(5);
    expect(remoto.items).toHaveLength(0);
  });

  it('verificación posterior: si otro creó el mismo número antes (id menor), este se renumera', async () => {
    // La unicidad de SharePoint llega 1–4 s tarde (spike S9): el duplicado no se rechaza al crear.
    const remoto = new RemotoFalso();
    remoto.unicidadActiva = false;
    remoto.antesDeCrear = (r) => {
      r.antesDeCrear = undefined;
      r.agregar({ ServicioId: 'competidor', NumeroSolicitud: 1 });
    };

    const resultado = await subir(remoto, nuevo());

    expect(resultado.numeroSolicitud).toBe(2);
    const propio = remoto.items.find((item) => item.fields.ServicioId === ID);
    expect(propio?.fields).toMatchObject({ NumeroSolicitud: 2, Title: 'CAR-2-NV4520' });
    expect(
      remoto.items.find((item) => item.fields.ServicioId === 'competidor')?.fields.NumeroSolicitud
    ).toBe(1);
  });

  it('verificación posterior: si este se creó primero (id menor), conserva su número', async () => {
    const remoto = new RemotoFalso();
    remoto.unicidadActiva = false;
    remoto.despuesDeCrear = (r) => {
      r.despuesDeCrear = undefined;
      r.agregar({ ServicioId: 'competidor', NumeroSolicitud: 1 });
    };

    const resultado = await subir(remoto, nuevo());

    expect(resultado.numeroSolicitud).toBe(1);
    const propio = remoto.items.find((item) => item.fields.ServicioId === ID);
    expect(propio?.fields.NumeroSolicitud).toBe(1);
  });

  it('la verificación se repite si el nuevo número también choca con un ítem anterior', async () => {
    const remoto = new RemotoFalso();
    remoto.unicidadActiva = false;
    remoto.antesDeCrear = (r) => {
      r.antesDeCrear = undefined;
      r.agregar({ ServicioId: 'c1', NumeroSolicitud: 1 }, '1');
    };
    remoto.antesDeRenumerar = (r, numero) => {
      r.antesDeRenumerar = undefined;
      r.agregar({ ServicioId: 'c2', NumeroSolicitud: numero }, '2');
    };

    const resultado = await subir(remoto, nuevo());

    expect(resultado.numeroSolicitud).toBe(3);
    const propio = remoto.items.find((item) => item.fields.ServicioId === ID);
    expect(propio?.fields).toMatchObject({ NumeroSolicitud: 3, Title: 'CAR-3-NV4520' });
  });

  it('si no consigue un número único tras los intentos, falla con un error reintentable', async () => {
    const remoto = new RemotoFalso();
    remoto.unicidadActiva = false;
    let contador = 0;
    remoto.antesDeCrear = (r) => {
      r.agregar({ ServicioId: 'c0', NumeroSolicitud: 1 }, '1');
      r.antesDeCrear = undefined;
    };
    remoto.antesDeRenumerar = (r, numero) => {
      contador += 1;
      r.agregar({ ServicioId: `c${contador}`, NumeroSolicitud: numero }, String(1 + contador));
    };

    const error = await subir(remoto, nuevo()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).reintentable).toBe(true);
  });
});
