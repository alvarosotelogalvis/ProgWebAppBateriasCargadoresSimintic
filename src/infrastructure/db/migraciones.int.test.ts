import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';

import type { Servicio } from '@/domain/servicio';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { AppDB, ESQUEMA_V1 } from './dexie';

const nombreUnico = () => `migracion-${Date.now()}-${Math.random().toString(16).slice(2)}`;

class AppDBV2 extends AppDB {
  constructor(nombre: string) {
    super(nombre);
    this.version(2).stores({
      ...ESQUEMA_V1,
      servicios: `${ESQUEMA_V1.servicios}, origen`,
    });
  }
}

describe('migración de esquema', () => {
  it('conserva servicios pendientes al subir de v1 a v2', async () => {
    const nombre = nombreUnico();
    const v1 = await crearDbPrueba(nombre);
    const pendiente: Servicio = {
      ...servicioBuilder().recibido().construir(),
      syncState: 'pending',
      camposSucios: ['marca'],
    };
    await v1.servicios.put(pendiente);
    v1.close();

    const v2 = new AppDBV2(nombre);
    try {
      await v2.open();
      expect(v2.verno).toBe(2);
      const recuperado = await v2.servicios.get(pendiente.id);
      expect(recuperado).toEqual(pendiente);
      expect(recuperado?.syncState).toBe('pending');
      expect(await v2.servicios.where('origen').equals('local').count()).toBe(1);
    } finally {
      await v2.delete();
    }
  });
});
