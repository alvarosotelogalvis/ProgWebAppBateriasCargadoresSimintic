import { describe, expect, it } from 'vitest';

import {
  esClienteTemporal,
  normalizarNombre,
  resolverVigente,
  tituloDeNombre,
  validarNombre,
} from './cliente';

describe('normalizarNombre (ES-010-02)', () => {
  it('pasa a mayúsculas, quita tildes y colapsa espacios', () => {
    expect(normalizarNombre('aris  mining segovía')).toBe('ARIS MINING SEGOVIA');
    expect(normalizarNombre('  Navar   Asociados ')).toBe('NAVAR ASOCIADOS');
  });

  it('dos escrituras del mismo cliente dan la misma clave', () => {
    expect(normalizarNombre('ARIS MINING SEGOVIA')).toBe(normalizarNombre('aris mining segovía'));
    expect(normalizarNombre('Minería Ñandú S.A.S.')).toBe(
      normalizarNombre('MINERIA  NANDU S.A.S.')
    );
  });

  it('conserva los demás signos (puntos, guiones, números)', () => {
    expect(normalizarNombre('Mina-2 S.A.S. 100%')).toBe('MINA-2 S.A.S. 100%');
  });

  it('un nombre vacío o de solo espacios queda vacío', () => {
    expect(normalizarNombre('')).toBe('');
    expect(normalizarNombre('   \t ')).toBe('');
  });
});

describe('tituloDeNombre', () => {
  it('pasa a mayúsculas y colapsa espacios pero conserva las tildes (valor de Title)', () => {
    expect(tituloDeNombre('  minera  los   andes ')).toBe('MINERA LOS ANDES');
    expect(tituloDeNombre('aris mining segovía')).toBe('ARIS MINING SEGOVÍA');
  });
});

describe('validarNombre', () => {
  it('rechaza vacío o solo espacios', () => {
    expect(validarNombre('')).toBe('VACIO');
    expect(validarNombre('    ')).toBe('VACIO');
  });

  it('acepta hasta 100 caracteres y rechaza 101', () => {
    expect(validarNombre('A'.repeat(100))).toBeNull();
    expect(validarNombre('A'.repeat(101))).toBe('LARGO');
  });

  it('cuenta los caracteres ya con los espacios colapsados', () => {
    expect(validarNombre(`${'A'.repeat(50)}      ${'B'.repeat(49)}`)).toBeNull();
  });

  it('acepta un nombre normal', () => {
    expect(validarNombre('Minera Los Andes')).toBeNull();
  });
});

describe('resolverVigente (FR-010-07, ES-010-08)', () => {
  it('sin fusiones devuelve el mismo id', () => {
    expect(resolverVigente(5, [])).toBe(5);
    expect(resolverVigente(5, [{ origenId: 1, destinoId: 2 }])).toBe(5);
  });

  it('sigue una fusión', () => {
    expect(resolverVigente(1, [{ origenId: 1, destinoId: 2 }])).toBe(2);
  });

  it('sigue una cadena A → B → C hasta el cliente vigente', () => {
    const fusionados = [
      { origenId: 1, destinoId: 2 },
      { origenId: 2, destinoId: 3 },
    ];
    expect(resolverVigente(1, fusionados)).toBe(3);
    expect(resolverVigente(2, fusionados)).toBe(3);
    expect(resolverVigente(3, fusionados)).toBe(3);
  });

  it('un ciclo A → B → A se corta y deja el id original (no se pierde ni se cuelga)', () => {
    const ciclo = [
      { origenId: 1, destinoId: 2 },
      { origenId: 2, destinoId: 1 },
    ];
    expect(resolverVigente(1, ciclo)).toBe(1);
    expect(resolverVigente(2, ciclo)).toBe(2);
  });

  it('una fusión de un cliente consigo mismo se ignora', () => {
    expect(resolverVigente(4, [{ origenId: 4, destinoId: 4 }])).toBe(4);
  });
});

describe('esClienteTemporal', () => {
  it('un id ≤ 0 es un cliente que aún no tiene id de SharePoint', () => {
    expect(esClienteTemporal(-1)).toBe(true);
    expect(esClienteTemporal(0)).toBe(true);
    expect(esClienteTemporal(7)).toBe(false);
  });
});
