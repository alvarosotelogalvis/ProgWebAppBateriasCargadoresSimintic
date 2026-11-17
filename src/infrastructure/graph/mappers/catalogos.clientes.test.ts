import { describe, expect, it } from 'vitest';

import { itemACliente, mapearClientes, mapearFusionados } from './catalogos';

const item = (id: number, fields: Record<string, unknown>) => ({ id: String(id), fields });

describe('itemACliente', () => {
  it('lee id, nombre, activo, guid, nombre normalizado y fusión', () => {
    expect(
      itemACliente(
        item(9, {
          Title: 'MINERA VIEJA',
          Activo: false,
          ClienteGuid: 'g-1',
          NombreNormalizado: 'MINERA VIEJA',
          FusionadoConId: 4,
        })
      )
    ).toEqual({
      id: 9,
      nombre: 'MINERA VIEJA',
      activo: false,
      guid: 'g-1',
      normalizado: 'MINERA VIEJA',
      fusionadoCon: 4,
    });
  });

  it('un cliente anterior, sin las columnas nuevas, es activo y no trae guid ni fusión', () => {
    expect(itemACliente(item(1, { Title: 'NAVAR ASOCIADOS' }))).toEqual({
      id: 1,
      nombre: 'NAVAR ASOCIADOS',
      activo: true,
    });
  });

  it('ignora valores vacíos o no numéricos en las columnas opcionales', () => {
    const cliente = itemACliente(
      item(2, { Title: 'X', ClienteGuid: '  ', NombreNormalizado: '', FusionadoConId: 'no' })
    );

    expect(cliente).toEqual({ id: 2, nombre: 'X', activo: true });
  });

  it('SharePoint puede devolver el id de fusión como texto', () => {
    expect(
      itemACliente(item(3, { Title: 'X', Activo: false, FusionadoConId: '7' })).fusionadoCon
    ).toBe(7);
  });
});

describe('mapearFusionados', () => {
  it('lista los clientes inactivos que apuntan a un destino', () => {
    const items = [
      item(1, { Title: 'ACTIVO', Activo: true }),
      item(2, { Title: 'FUSIONADO', Activo: false, FusionadoConId: 1 }),
      item(3, { Title: 'INACTIVO SIN FUSION', Activo: false }),
      item(4, { Title: 'OTRO', Activo: false, FusionadoConId: 2 }),
    ];

    expect(mapearFusionados(items)).toEqual([
      { origenId: 2, destinoId: 1 },
      { origenId: 4, destinoId: 2 },
    ]);
  });

  it('ignora un cliente activo aunque tenga FusionadoConId (dato inconsistente)', () => {
    expect(mapearFusionados([item(1, { Title: 'X', Activo: true, FusionadoConId: 9 })])).toEqual(
      []
    );
  });

  it('ignora una fusión de un cliente consigo mismo', () => {
    expect(mapearFusionados([item(5, { Title: 'X', Activo: false, FusionadoConId: 5 })])).toEqual(
      []
    );
  });
});

describe('mapearClientes (el catálogo no ofrece los inactivos)', () => {
  it('excluye los inactivos y ordena por nombre', () => {
    const catalogo = mapearClientes([
      item(2, { Title: 'ZETA', Activo: true }),
      item(3, { Title: 'FUSIONADO', Activo: false, FusionadoConId: 2 }),
      item(1, { Title: 'ALFA', Activo: true }),
    ]);

    expect(catalogo.map((c) => c.nombre)).toEqual(['ALFA', 'ZETA']);
  });
});
