import { z } from 'zod';

export type ModoAutenticacionSync = 'confirmar' | 'reautenticar';

export interface ConfigApp {
  versionMinimaApp: string;
  syncModoAutenticacion: ModoAutenticacionSync;
  syncReautenticacionHoras: number;
  minFotosIngreso: number;
  maxFotosIngreso: number;
  minFotosSalida: number;
  maxFotosSalida: number;
  maxTamanoPdfMB: number;
  imagenMaxLadoPx: number;
  imagenCalidad: number;
  vidaUtilMesesDefecto: number;
  umbralesAlertaDias: number[];
  retencionCerradosMeses: number;
  retencionOriginalesDias: number;
  descargarMiniaturasRemotas: boolean;
  diagnosticoValorDisposicionFinal: string;
  recordatorioPendientesHoras: number;
  correoDestinoOT?: string;
  correoDestinoAlertas?: string;
}

export const CONFIG_DEFECTO: Readonly<ConfigApp> = Object.freeze({
  versionMinimaApp: '1.0.0',
  syncModoAutenticacion: 'confirmar',
  syncReautenticacionHoras: 12,
  minFotosIngreso: 1,
  maxFotosIngreso: 5,
  minFotosSalida: 1,
  maxFotosSalida: 10,
  maxTamanoPdfMB: 20,
  imagenMaxLadoPx: 1920,
  imagenCalidad: 0.75,
  vidaUtilMesesDefecto: 12,
  umbralesAlertaDias: [90, 60, 30],
  retencionCerradosMeses: 6,
  retencionOriginalesDias: 7,
  descargarMiniaturasRemotas: true,
  diagnosticoValorDisposicionFinal: 'D. FINAL',
  recordatorioPendientesHoras: 24,
});

export interface LoggerAdvertencia {
  warn(evento: string, datos?: Record<string, unknown>): void;
}

const entero = (min: number, max = Number.MAX_SAFE_INTEGER) =>
  z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor),
    z.number().int().min(min).max(max)
  );

const booleano = z.preprocess((valor) => {
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase();
    if (normalizado === 'true') return true;
    if (normalizado === 'false') return false;
  }
  return valor;
}, z.boolean());

const csvEnteros = z.preprocess((valor) => {
  if (typeof valor === 'string') {
    return valor
      .split(',')
      .map((parte) => Number(parte.trim()))
      .filter((numero) => Number.isFinite(numero));
  }
  return valor;
}, z.array(z.number().int().positive()).min(1));

const camposRemotos = {
  VersionMinimaApp: z.string().regex(/^\d+\.\d+\.\d+$/),
  SyncModoAutenticacion: z.enum(['confirmar', 'reautenticar']),
  SyncReautenticacionHoras: entero(1),
  MinFotosIngreso: entero(0, 10),
  MaxFotosIngreso: entero(1, 50),
  MinFotosSalida: entero(0, 10),
  MaxFotosSalida: entero(1, 50),
  MaxTamanoPdfMB: entero(1, 200),
  ImagenMaxLadoPx: entero(320, 8000),
  ImagenCalidad: z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor),
    z.number().gt(0).max(1)
  ),
  VidaUtilMesesDefecto: entero(1, 120),
  UmbralesAlertaDias: csvEnteros,
  RetencionCerradosMeses: entero(1, 120),
  RetencionOriginalesDias: entero(0, 365),
  DescargarMiniaturasRemotas: booleano,
  DiagnosticoValorDisposicionFinal: z.string().trim().min(1).max(100),
  RecordatorioPendientesHoras: entero(1, 720),
  CorreoDestinoOT: z.string().trim().min(1).max(500),
  CorreoDestinoAlertas: z.string().trim().min(1).max(500),
} as const;

type ClaveRemota = keyof typeof camposRemotos;

const DESTINO_LOCAL: Record<ClaveRemota, keyof ConfigApp> = {
  VersionMinimaApp: 'versionMinimaApp',
  SyncModoAutenticacion: 'syncModoAutenticacion',
  SyncReautenticacionHoras: 'syncReautenticacionHoras',
  MinFotosIngreso: 'minFotosIngreso',
  MaxFotosIngreso: 'maxFotosIngreso',
  MinFotosSalida: 'minFotosSalida',
  MaxFotosSalida: 'maxFotosSalida',
  MaxTamanoPdfMB: 'maxTamanoPdfMB',
  ImagenMaxLadoPx: 'imagenMaxLadoPx',
  ImagenCalidad: 'imagenCalidad',
  VidaUtilMesesDefecto: 'vidaUtilMesesDefecto',
  UmbralesAlertaDias: 'umbralesAlertaDias',
  RetencionCerradosMeses: 'retencionCerradosMeses',
  RetencionOriginalesDias: 'retencionOriginalesDias',
  DescargarMiniaturasRemotas: 'descargarMiniaturasRemotas',
  DiagnosticoValorDisposicionFinal: 'diagnosticoValorDisposicionFinal',
  RecordatorioPendientesHoras: 'recordatorioPendientesHoras',
  CorreoDestinoOT: 'correoDestinoOT',
  CorreoDestinoAlertas: 'correoDestinoAlertas',
};

export const esquemaConfigRemota = z.object(camposRemotos).partial();

const esRegistro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** Combina la configuración remota (clave/valor de SharePoint) con los valores por defecto. */
export const combinarConfig = (
  remota: unknown,
  defecto: ConfigApp = CONFIG_DEFECTO,
  logger?: LoggerAdvertencia
): ConfigApp => {
  const combinada: ConfigApp = { ...defecto };

  if (remota === undefined || remota === null) {
    return combinada;
  }

  if (!esRegistro(remota)) {
    logger?.warn('config.remota.invalida', { motivo: 'no-es-objeto' });
    return combinada;
  }

  for (const clave of Object.keys(camposRemotos) as ClaveRemota[]) {
    if (!(clave in remota)) continue;
    const resultado = camposRemotos[clave].safeParse(remota[clave]);
    if (!resultado.success) {
      logger?.warn('config.remota.valor.invalido', {
        clave,
        issues: resultado.error.issues.map((issue) => issue.message),
      });
      continue;
    }
    const destino = DESTINO_LOCAL[clave];
    const valor = resultado.data;
    (combinada as unknown as Record<string, unknown>)[destino] = Array.isArray(valor)
      ? [...valor]
      : valor;
  }

  if (combinada.maxFotosIngreso < combinada.minFotosIngreso) {
    logger?.warn('config.remota.rango.invalido', { campo: 'fotosIngreso' });
    combinada.maxFotosIngreso = defecto.maxFotosIngreso;
    combinada.minFotosIngreso = defecto.minFotosIngreso;
  }
  if (combinada.maxFotosSalida < combinada.minFotosSalida) {
    logger?.warn('config.remota.rango.invalido', { campo: 'fotosSalida' });
    combinada.maxFotosSalida = defecto.maxFotosSalida;
    combinada.minFotosSalida = defecto.minFotosSalida;
  }
  combinada.umbralesAlertaDias = [...combinada.umbralesAlertaDias].sort((a, b) => b - a);

  return combinada;
};
