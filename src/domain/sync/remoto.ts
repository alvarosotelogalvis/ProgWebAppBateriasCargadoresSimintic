import type { CamposServicio } from '../servicio';

/** Datos de captura que viven en columnas de SharePoint fuera de `CamposServicio`. */
export interface MetaRemotaServicio {
  readonly codigo?: string;
  readonly capturadoPor?: string;
  readonly capturadoPorNombre?: string;
  readonly creadoEn?: string;
  readonly dispositivoId?: string;
  readonly appVersion?: string;
  readonly urlCarpetaAdjuntos?: string;
}

/** Cambio en un servicio remoto (desde SharePoint), ya traducido al dominio. */
export interface RemotoCambio {
  /** ID del cambio (el del ítem de la lista). */
  readonly id: string;
  /** El UUID del servicio (columna ServicioId). Vacío si el ítem no lo tiene. */
  readonly servicioId: string;
  /** Campos del servicio normalizados por `deCamposSP`. */
  readonly fields: Partial<CamposServicio>;
  /** ID del ítem en SharePoint (para el PATCH). */
  readonly itemId?: string;
  /** eTag vigente del ítem. */
  readonly eTag?: string;
  /** Enlace al ítem en SharePoint. */
  readonly webUrl?: string;
  /** El ítem fue eliminado en SharePoint. */
  readonly deleted?: boolean;
  /** Fecha de modificación en SharePoint. */
  readonly modified?: string;
  /** Correo de quien lo modificó (si se conoce). */
  readonly editor?: string;
  /** Nombre de quien lo modificó (si se conoce). */
  readonly editorNombre?: string;
  /** Datos de captura (solo necesarios para insertar). */
  readonly meta?: MetaRemotaServicio;
}
