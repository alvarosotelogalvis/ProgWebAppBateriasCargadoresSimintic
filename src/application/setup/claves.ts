export const CLAVES_META = {
  ultimaCuenta: 'ultimaCuenta',
  ultimoLoginInteractivoEn: 'ultimoLoginInteractivoEn',
  cuentaHomeId: 'cuentaHomeId',
  configuracionInicialCompleta: 'configuracionInicialCompleta',
  almacenamientoPersistente: 'almacenamientoPersistente',
  sitio: 'sitio',
  siteId: 'siteId',
  webUrl: 'webUrl',
  listIds: 'listIds',
  driveId: 'driveId',
  ultimaSyncEn: 'ultimaSyncEn',
  ultimoCorrelationId: 'ultimoCorrelationId',
  deltaLinkServicios: 'deltaLinkServicios',
} as const;

export const CLAVES_CATALOGO = {
  clientes: 'clientes',
  marcas: 'marcas',
  config: 'config',
} as const;

export const COLUMNAS_CHOICE = [
  'Diagnostico',
  'Estado',
  'CotizacionEstado',
  'TipoEquipo',
  'TipoAdjunto',
] as const;

export type ColumnaChoice = (typeof COLUMNAS_CHOICE)[number];

export const claveChoice = (columna: ColumnaChoice): string => `choices:${columna}`;
