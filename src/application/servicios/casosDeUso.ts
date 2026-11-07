import { crearActualizarCampos } from './actualizarCampos';
import { crearAnular } from './anular';
import { crearCompletarEtapa } from './completarEtapa';
import { crearCrearBorrador } from './crearBorrador';
import type { DepsServicios } from './deps';
import { crearDescartarBorrador } from './descartarBorrador';
import { crearResolverConflictos } from './resolverConflictos';

export type { DepsServicios } from './deps';

export const crearCasosDeUso = (deps: DepsServicios) => ({
  crearBorrador: crearCrearBorrador(deps),
  actualizarCampos: crearActualizarCampos(deps),
  completarEtapa: crearCompletarEtapa(deps),
  anular: crearAnular(deps),
  descartarBorrador: crearDescartarBorrador(deps),
  resolverConflictos: crearResolverConflictos(deps),
});
