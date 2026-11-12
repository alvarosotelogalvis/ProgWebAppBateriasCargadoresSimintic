import { crearActualizarCampos } from './actualizarCampos';
import { crearAnular } from './anular';
import { crearCambiarRespuestaCotizacion } from './cambiarRespuestaCotizacion';
import { crearCompletarEtapa } from './completarEtapa';
import { crearCorregirCampos } from './corregirCampos';
import { crearCrearBorrador } from './crearBorrador';
import type { DepsServicios } from './deps';
import { crearDescartarBorrador } from './descartarBorrador';

export type { DepsServicios } from './deps';

export const crearCasosDeUso = (deps: DepsServicios) => ({
  crearBorrador: crearCrearBorrador(deps),
  actualizarCampos: crearActualizarCampos(deps),
  completarEtapa: crearCompletarEtapa(deps),
  anular: crearAnular(deps),
  corregirCampos: crearCorregirCampos(deps),
  cambiarRespuestaCotizacion: crearCambiarRespuestaCotizacion(deps),
  descartarBorrador: crearDescartarBorrador(deps),
});
