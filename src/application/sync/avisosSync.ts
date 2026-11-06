import type { AuthPort } from '@/application/ports/authPort';
import type { Clock } from '@/application/ports/clock';
import type { MetaRepository } from '@/application/ports/metaRepository';
import { CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp } from '@/domain/config';

import { requiereReautenticacion } from './confirmarIdentidad';

/** Plan §3.4: el aviso de conexión aparece como máximo una vez cada 30 min. */
export const INTERVALO_AVISO_CONEXION_MS = 30 * 60 * 1000;

const HORA_MS = 60 * 60 * 1000;

export interface EntradaAvisoConexion {
  readonly pendientes: number;
  readonly sesionVigente: boolean;
  readonly ultimoAvisoMs: number | null;
  readonly ahoraMs: number;
}

/**
 * ES-005-21: al volver la conexión se ofrece sincronizar solo si hay pendientes y la
 * sesión no exige reautenticar (para no forzar un redirect inesperado). Nunca sincroniza.
 */
export function debeMostrarAvisoConexion(entrada: EntradaAvisoConexion): boolean {
  if (entrada.pendientes <= 0 || !entrada.sesionVigente) return false;
  if (entrada.ultimoAvisoMs === null) return true;
  return entrada.ahoraMs - entrada.ultimoAvisoMs >= INTERVALO_AVISO_CONEXION_MS;
}

/** Horas completas transcurridas desde `desdeIso`, o `null` si no hay fecha válida. */
export function antiguedadHoras(desdeIso: string | undefined, ahoraMs: number): number | null {
  if (!desdeIso) return null;
  const desde = Date.parse(desdeIso);
  if (!Number.isFinite(desde)) return null;
  return Math.max(0, Math.floor((ahoraMs - desde) / HORA_MS));
}

/** ES-005-22: recordatorio cuando el pendiente más antiguo supera `RecordatorioPendientesHoras`. */
export function debeRecordarPendientes(
  masAntiguoIso: string | undefined,
  ahoraMs: number,
  umbralHoras: number
): boolean {
  const horas = antiguedadHoras(masAntiguoIso, ahoraMs);
  return horas !== null && horas >= umbralHoras;
}

export interface DepsSesionSync {
  readonly auth: Pick<AuthPort, 'cuentaActiva' | 'sesionVigente'>;
  readonly meta: Pick<MetaRepository, 'obtener'>;
  readonly clock: Pick<Clock, 'ahoraMs'>;
  readonly config: () => ConfigApp;
}

/** La sesión permite confirmar el sync sin login interactivo (SDD §8.4). */
export async function sesionSyncVigente(deps: DepsSesionSync): Promise<boolean> {
  const cuenta = deps.auth.cuentaActiva();
  if (!cuenta || !deps.auth.sesionVigente()) return false;

  const config = deps.config();
  const ultimoLogin =
    (await deps.meta.obtener<string>(CLAVES_META.ultimoLoginInteractivoEn)) ??
    cuenta.ultimoLoginInteractivoEn;

  return !requiereReautenticacion(
    config.syncModoAutenticacion,
    ultimoLogin,
    config.syncReautenticacionHoras,
    deps.clock.ahoraMs()
  );
}
