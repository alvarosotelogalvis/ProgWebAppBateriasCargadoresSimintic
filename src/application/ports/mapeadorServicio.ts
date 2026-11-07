import type { CamposServicio, Servicio, TipoAdjunto } from '@/domain/servicio';

/**
 * Contrato con el que la capa de aplicación proyecta el dominio a las columnas
 * de SharePoint sin depender de `infrastructure/graph` (ADR-0004).
 */
export interface MapeadorServicio {
  aCamposSP(
    servicio: Servicio,
    camposSucios?: readonly (keyof CamposServicio)[]
  ): Record<string, unknown>;
  deCamposSP(campos: Record<string, unknown>): Partial<CamposServicio>;
  valorTipoAdjunto(tipo: TipoAdjunto): string;
}
