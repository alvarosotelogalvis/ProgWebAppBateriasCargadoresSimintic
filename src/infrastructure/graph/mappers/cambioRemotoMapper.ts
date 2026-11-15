import type { RemotoCambio } from '@/domain/sync/remoto';

import { deCamposSP } from './servicioMapper';

/** Ítem de la lista Servicios tal como lo devuelve Graph (lectura normal o entrada de delta). */
export interface ItemListaServicio {
  readonly id?: string | number;
  readonly fields?: Record<string, unknown>;
  readonly '@removed'?: unknown;
  readonly '@odata.etag'?: string;
  readonly eTag?: string;
  readonly webUrl?: string;
  readonly lastModifiedDateTime?: string;
  readonly lastModifiedBy?: {
    readonly user?: { readonly email?: string; readonly displayName?: string };
  };
}

const texto = (valor: unknown): string | undefined =>
  typeof valor === 'string' && valor.trim() !== '' ? valor : undefined;

/** Columnas de captura que viven fuera de `CamposServicio`. */
function metaDe(campos: Record<string, unknown>): NonNullable<RemotoCambio['meta']> {
  const meta: { -readonly [K in keyof NonNullable<RemotoCambio['meta']>]: string } = {};
  const asignar = (clave: keyof typeof meta, columna: string): void => {
    const valor = texto(campos[columna]);
    if (valor !== undefined) meta[clave] = valor;
  };
  asignar('codigo', 'Title');
  asignar('capturadoPor', 'CapturadoPor');
  asignar('capturadoPorNombre', 'CapturadoPorNombre');
  asignar('creadoEn', 'CapturadoEn');
  asignar('dispositivoId', 'DispositivoId');
  asignar('appVersion', 'AppVersion');
  asignar('urlCarpetaAdjuntos', 'UrlCarpetaAdjuntos');
  return meta;
}

/**
 * Traduce un ítem de la lista Servicios (o su entrada de delta) a un cambio del dominio.
 * Las entradas eliminadas de un delta solo traen el `id`.
 */
export function itemACambio(item: ItemListaServicio): RemotoCambio {
  const campos = item.fields ?? {};
  const eliminado = item['@removed'] !== undefined;
  const eTag = item['@odata.etag'] ?? item.eTag;
  const modificado = item.lastModifiedDateTime ?? texto(campos.Modified);
  const editor = item.lastModifiedBy?.user?.email;
  const editorNombre = item.lastModifiedBy?.user?.displayName;
  return {
    id: String(item.id),
    servicioId: texto(campos.ServicioId) ?? '',
    fields: eliminado ? {} : deCamposSP(campos),
    itemId: String(item.id),
    ...(eTag ? { eTag } : {}),
    ...(item.webUrl ? { webUrl: item.webUrl } : {}),
    ...(eliminado ? { deleted: true } : {}),
    ...(modificado ? { modified: modificado } : {}),
    ...(editor ? { editor } : {}),
    ...(editorNombre ? { editorNombre } : {}),
    meta: metaDe(campos),
  };
}
