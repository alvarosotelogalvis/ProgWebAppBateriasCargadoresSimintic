import { describe, it, expect } from 'vitest';
import { servicioBuilder } from '../../tests/builders';
import { camposEditables } from './estados';

describe('camposEditables por estado × rol', () => {
  it('BORRADOR: todos los campos de recepción editables', () => {
    const s = servicioBuilder().estado('BORRADOR').build();
    const campos = camposEditables(s, ['Tecnico']);

    expect(campos.has('tipoEquipo')).toBe(true);
    expect(campos.has('clienteId')).toBe(true);
  });

  it('FACTURADO: solo Admin edita', () => {
    const s = servicioBuilder().estado('FACTURADO').build();
    const admin = camposEditables(s, ['Administrador']);
    const tecnico = camposEditables(s, ['Tecnico']);

    expect(admin.size).toBeGreaterThan(0);
    expect(tecnico.size).toBe(0);
  });

  it('Campos nunca editables: id, codigo, capturadoPor, estado', () => {
    const s = servicioBuilder().estado('BORRADOR').build();
    const admin = camposEditables(s, ['Administrador']);

    expect(admin.has('id')).toBe(false);
    expect(admin.has('codigo')).toBe(false);
    expect(admin.has('estado')).toBe(false);
  });
});
