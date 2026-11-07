/** Cambio en un servicio remoto (desde SharePoint). */
export interface RemotoCambio {
  /** ID único del ítem en SharePoint. */
  readonly id: string;
  /** El UUID del servicio (campo ServicioId en SharePoint). */
  readonly servicioId: string;
  /** Campos del servicio copiados desde SharePoint (con normalización via `deCamposSP`). */
  readonly fields: Record<string, unknown>;
  /** ID del ítem en SharePoint (para PATCH). */
  readonly itemId?: string;
  /** Marca si el ítem fue eliminado. */
  readonly deleted?: boolean;
  /** Fecha de modificación en SharePoint. */
  readonly modified?: string;
  /** Editor del ítem en SharePoint (si se conoce). */
  readonly editor?: string;
  /** Editar quién lo modificó (si se conoce). */
  readonly editorNombre?: string;
}
