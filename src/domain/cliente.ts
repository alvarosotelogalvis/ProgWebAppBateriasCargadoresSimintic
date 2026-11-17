/**
 * Clientes creados desde la app y fusión de clientes (ADR-0023, spec 010).
 * Funciones puras: sin React, Dexie, MSAL ni `fetch` (regla de capas, ADR-0004).
 */

export const NOMBRE_CLIENTE_MAX = 100;

/** Cliente creado en el dispositivo que aún no tiene id de SharePoint (`id` temporal ≤ 0). */
export interface ClienteNuevo {
  /** Id temporal negativo; los servicios que lo usan apuntan a él hasta sincronizar. */
  readonly id: number;
  /** UUID v4 generado en el dispositivo: hace idempotente la creación en SharePoint. */
  readonly guid: string;
  /** Nombre visible (`Title`): mayúsculas y espacios colapsados, con tildes. */
  readonly nombre: string;
  /** Clave de comparación: mayúsculas, sin tildes ni espacios sobrantes. */
  readonly normalizado: string;
  readonly creadoEn: string;
}

/** Un cliente que se fusionó en otro (queda inactivo y apunta a `destinoId`). */
export interface ClienteFusionado {
  readonly origenId: number;
  readonly destinoId: number;
}

const colapsar = (texto: string): string => texto.trim().replace(/\s+/g, ' ');

/** Clave de comparación: «aris  mining segovía» → `ARIS MINING SEGOVIA`. */
export const normalizarNombre = (nombre: string): string =>
  colapsar(nombre.normalize('NFD').replace(/[̀-ͯ]/g, '')).toUpperCase();

/** Valor de `Title`: mayúsculas y espacios colapsados, conservando las tildes. */
export const tituloDeNombre = (nombre: string): string =>
  colapsar(nombre).toLocaleUpperCase('es-CO');

/** `null` si el nombre es válido (1 a 100 caracteres una vez colapsados los espacios). */
export const validarNombre = (nombre: string): 'VACIO' | 'LARGO' | null => {
  const limpio = colapsar(nombre);
  if (limpio === '') return 'VACIO';
  if (limpio.length > NOMBRE_CLIENTE_MAX) return 'LARGO';
  return null;
};

/** Un id ≤ 0 es un cliente que aún no tiene id de SharePoint (nunca se escribe en la lista). */
export const esClienteTemporal = (id: number): boolean => !(id > 0);

/**
 * Sigue la cadena de fusiones hasta el cliente vigente. Un ciclo o una fusión consigo mismo no se
 * resuelven: devuelven el id original para no perder la asociación ni colgarse.
 */
export const resolverVigente = (id: number, fusionados: readonly ClienteFusionado[]): number => {
  const destinoDe = new Map<number, number>();
  for (const { origenId, destinoId } of fusionados) {
    if (origenId !== destinoId) destinoDe.set(origenId, destinoId);
  }
  const visitados = new Set<number>([id]);
  let actual = id;
  for (;;) {
    const siguiente = destinoDe.get(actual);
    if (siguiente === undefined) return actual;
    if (visitados.has(siguiente)) return id;
    visitados.add(siguiente);
    actual = siguiente;
  }
};
