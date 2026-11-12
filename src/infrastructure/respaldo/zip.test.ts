import { describe, expect, it } from 'vitest';

import { desempaquetar, empaquetar, estimarTamano, leerTexto } from './zip';

describe('empaquetar / desempaquetar', () => {
  it('hace ida y vuelta de archivos de texto conservando ruta, contenido y tipo', async () => {
    const paquete = await empaquetar([
      { ruta: 'servicios.json', contenido: '{"a":1}', tipo: 'application/json' },
      { ruta: 'notas/leeme.txt', contenido: 'hola', tipo: 'text/plain' },
    ]);

    const archivos = await desempaquetar(paquete);

    expect(archivos).toEqual([
      { ruta: 'servicios.json', contenido: '{"a":1}', tipo: 'application/json' },
      { ruta: 'notas/leeme.txt', contenido: 'hola', tipo: 'text/plain' },
    ]);
  });

  it('el paquete realmente contiene los archivos (no solo el manifiesto)', async () => {
    const paquete = await empaquetar([{ ruta: 'a.txt', contenido: 'contenido de prueba' }]);

    const texto = await leerTexto(paquete);

    expect(texto).toContain('contenido de prueba');
  });

  it('los blobs viajan como data URL y se recuperan con su contenido', async () => {
    const blob = new Blob(['%PDF-1.4 datos'], { type: 'application/pdf' });

    const [archivo] = await desempaquetar(
      await empaquetar([{ ruta: 'adjuntos/a.pdf', contenido: blob, tipo: 'application/pdf' }])
    );

    expect(archivo?.ruta).toBe('adjuntos/a.pdf');
    expect(typeof archivo?.contenido).toBe('string');
    expect(String(archivo?.contenido)).toMatch(/^data:application\/pdf;base64,/);
    const base64 = String(archivo?.contenido).split(',')[1] ?? '';
    expect(atob(base64)).toBe('%PDF-1.4 datos');
  });

  it('rechaza un archivo que no es un respaldo', async () => {
    await expect(desempaquetar(new Blob(['{"otra":"cosa"}']))).rejects.toThrow(
      'Formato de respaldo no válido'
    );
  });

  it('estima el tamaño con un 10 % de margen', () => {
    expect(estimarTamano([{ ruta: 'a', contenido: 'x'.repeat(100) }])).toBe(110);
  });
});
