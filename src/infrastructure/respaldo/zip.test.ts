// @vitest-environment node
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { desempaquetar, empaquetar, estimarTamano, leerTexto } from './zip';

const bytesDe = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await new Response(blob).arrayBuffer());

describe('empaquetar / desempaquetar (ZIP real)', () => {
  it('produce un ZIP estándar que cualquier lector abre', async () => {
    const paquete = await empaquetar([
      { ruta: 'servicios.json', contenido: '{"a":1}' },
      { ruta: 'notas/leeme.txt', contenido: 'hola' },
    ]);

    expect(paquete.type).toBe('application/zip');
    const bytes = await bytesDe(paquete);
    // Firma «PK» de los archivos ZIP.
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    const contenido = unzipSync(bytes);
    expect(Object.keys(contenido).sort()).toEqual(['notas/leeme.txt', 'servicios.json']);
    expect(new TextDecoder().decode(contenido['notas/leeme.txt'])).toBe('hola');
  });

  it('hace ida y vuelta de texto y de archivos binarios sin alterarlos', async () => {
    const original = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    const paquete = await empaquetar([
      { ruta: 'servicios.json', contenido: '{"ñ":"acentuación"}' },
      { ruta: 'archivos/a.pdf', contenido: new Blob([original], { type: 'application/pdf' }) },
    ]);

    const archivos = await desempaquetar(paquete);

    const texto = archivos.find((archivo) => archivo.ruta === 'servicios.json');
    expect(texto?.contenido).toBeInstanceOf(Blob);
    expect(await leerTexto(texto?.contenido as Blob)).toBe('{"ñ":"acentuación"}');
    const pdf = archivos.find((archivo) => archivo.ruta === 'archivos/a.pdf');
    expect(pdf?.tipo).toBe('application/pdf');
    expect(await bytesDe(pdf?.contenido as Blob)).toEqual(original);
  });

  it('rechaza un archivo que no es un ZIP', async () => {
    await expect(desempaquetar(new Blob(['{"otra":"cosa"}']))).rejects.toThrow(
      'El archivo no es un respaldo válido'
    );
  });

  it('estima el tamaño sin comprimir', () => {
    expect(estimarTamano([{ ruta: 'a', contenido: 'x'.repeat(100) }])).toBe(100);
    expect(estimarTamano([{ ruta: 'b', contenido: new Blob(['abc']) }])).toBe(3);
  });
});
