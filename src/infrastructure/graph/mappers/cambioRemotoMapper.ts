import type { CamposServicio } from '@/domain/servicio';
import type { RemotoCambio } from '@/domain/sync/remoto';

import { normalizarETag } from '../etag';
import { CAMPO_SP, deCamposSP } from './servicioMapper';

/** Ítem de la lista Servicios tal como lo devuelve Graph (lectura normal o entrada de delta). */
export interface ItemListaServicio {
  readonly id?: string | number;
  readonly fields?: Record<string, unknown>;
  readonly '@removed'?: unknown;
  /** Marca de eliminación del `delta` de listas de SharePoint (`{ state: 'deleted' }`). */
  readonly deleted?: unknown;
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

/** Campos obligatorios: SharePoint nunca los deja vacíos, así que su ausencia no es un borrado. */
const CAMPOS_OBLIGATORIOS = new Set<keyof CamposServicio>([
  'tipoEquipo',
  'estado',
  'fechaRecepcion',
  'clienteId',
  'numeroSolicitud',
  'marca',
  'referencia',
  'serie',
]);

/**
 * Campos vaciables cuya columna viene sin valor. SharePoint omite las columnas vacías, por lo que
 * solo se infiere de un ítem completo (trae `ServicioId`); un ítem sin `fields` no dice nada.
 */
function vaciadosDe(campos: Record<string, unknown>): (keyof CamposServicio)[] {
  if (texto(campos.ServicioId) === undefined) return [];
  const vaciados: (keyof CamposServicio)[] = [];
  for (const [campo, columna] of Object.entries(CAMPO_SP)) {
    const clave = campo as keyof CamposServicio;
    if (columna === undefined || CAMPOS_OBLIGATORIOS.has(clave)) continue;
    const valor = campos[columna];
    if (valor === undefined || valor === null) vaciados.push(clave);
  }
  return vaciados;
}

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
  // SharePoint real marca el borrado con `deleted` (no `@removed`, que es el de OneDrive): se aceptan ambos.
  const eliminado = item['@removed'] !== undefined || item.deleted !== undefined;
  const eTagCrudo = item['@odata.etag'] ?? item.eTag;
  const eTag = eTagCrudo ? normalizarETag(eTagCrudo) : undefined;
  const modificado = item.lastModifiedDateTime ?? texto(campos.Modified);
  const editor = item.lastModifiedBy?.user?.email;
  const editorNombre = item.lastModifiedBy?.user?.displayName;
  return {
    id: String(item.id),
    servicioId: texto(campos.ServicioId) ?? '',
    fields: eliminado ? {} : deCamposSP(campos),
    ...(eliminado ? {} : { vaciados: vaciadosDe(campos) }),
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
