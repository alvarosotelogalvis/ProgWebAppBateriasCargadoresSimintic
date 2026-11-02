// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { conLockSync } from './webLocks';

interface LockManagerFake {
  request<T>(
    nombre: string,
    opciones: { ifAvailable?: boolean },
    callback: (lock: unknown) => Promise<T>
  ): Promise<T>;
  ocupados(): string[];
}

const crearLockManagerFake = (): LockManagerFake => {
  const colas = new Map<string, Promise<unknown>>();
  const enUso = new Set<string>();

  const ejecutar = async <T>(
    nombre: string,
    callback: (lock: unknown) => Promise<T>
  ): Promise<T> => {
    enUso.add(nombre);
    try {
      return await callback({ name: nombre });
    } finally {
      enUso.delete(nombre);
    }
  };

  return {
    request<T>(
      nombre: string,
      opciones: { ifAvailable?: boolean },
      callback: (lock: unknown) => Promise<T>
    ): Promise<T> {
      if (opciones.ifAvailable === true) {
        if (enUso.has(nombre)) return callback(null);
        return ejecutar(nombre, callback);
      }

      const anterior = colas.get(nombre) ?? Promise.resolve();
      const actual = anterior.then(() => ejecutar(nombre, callback));
      colas.set(
        nombre,
        actual.catch(() => undefined)
      );
      return actual;
    },
    ocupados: () => [...enUso],
  };
};

const diferido = <T>() => {
  let resolver!: (valor: T) => void;
  let rechazar!: (error: unknown) => void;
  const promesa = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });
  return { promesa, resolver, rechazar };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('conLockSync', () => {
  it('ejecuta la tarea en serie cuando el navegador no expone Web Locks', async () => {
    vi.stubGlobal('navigator', {});

    const resultado = await conLockSync('sync-push', async () => 'hecho');

    expect(resultado).toEqual({ adquirido: true, valor: 'hecho' });
  });

  it('devuelve adquirido:false sin ejecutar la tarea cuando el lock está ocupado', async () => {
    const locks = crearLockManagerFake();
    vi.stubGlobal('navigator', { locks });

    const primerTurno = diferido<void>();
    let ejecuciones = 0;
    const enCurso = conLockSync(
      'sync-push',
      async () => {
        ejecuciones += 1;
        await primerTurno.promesa;
        return 'primera';
      },
      { ifAvailable: true }
    );

    await vi.waitFor(() => expect(locks.ocupados()).toContain('sync-push'));

    let segundaEjecuto = false;
    const segunda = await conLockSync(
      'sync-push',
      async () => {
        segundaEjecuto = true;
        return 'segunda';
      },
      { ifAvailable: true }
    );

    expect(segunda).toEqual({ adquirido: false });
    expect(segundaEjecuto).toBe(false);
    expect(ejecuciones).toBe(1);

    primerTurno.resolver();
    await expect(enCurso).resolves.toEqual({ adquirido: true, valor: 'primera' });
  });

  it('serializa dos sincronizaciones concurrentes: solo una corre a la vez', async () => {
    const locks = crearLockManagerFake();
    vi.stubGlobal('navigator', { locks });

    const orden: string[] = [];
    const inicioPrimera = diferido<void>();
    const finPrimera = diferido<void>();

    const primera = conLockSync('sync-push', async () => {
      orden.push('primera:inicio');
      inicioPrimera.resolver();
      await finPrimera.promesa;
      orden.push('primera:fin');
      return 'primera';
    });

    await inicioPrimera.promesa;

    const segunda = conLockSync('sync-push', async () => {
      orden.push('segunda:inicio');
      return 'segunda';
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(orden).toEqual(['primera:inicio']);

    finPrimera.resolver();
    await expect(primera).resolves.toEqual({ adquirido: true, valor: 'primera' });
    await expect(segunda).resolves.toEqual({ adquirido: true, valor: 'segunda' });

    expect(orden).toEqual(['primera:inicio', 'primera:fin', 'segunda:inicio']);
  });

  it('permite adquirir el lock de nuevo después de liberarlo', async () => {
    const locks = crearLockManagerFake();
    vi.stubGlobal('navigator', { locks });

    const primera = await conLockSync('sync-push', async () => 1, { ifAvailable: true });
    const segunda = await conLockSync('sync-push', async () => 2, { ifAvailable: true });

    expect(primera).toEqual({ adquirido: true, valor: 1 });
    expect(segunda).toEqual({ adquirido: true, valor: 2 });
    expect(locks.ocupados()).toEqual([]);
  });
});
