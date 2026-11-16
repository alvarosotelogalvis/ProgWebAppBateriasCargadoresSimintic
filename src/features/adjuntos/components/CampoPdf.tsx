import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgregarPdfResultado, TipoPdf } from '@/application/adjuntos/agregarPdf';
import type { Adjunto } from '@/domain/adjunto';
import { Banner } from '@/shared/ui/Banner';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import AdjuntoPdf from './AdjuntoPdf';
import styles from './CampoPdf.module.css';

export interface CampoPdfProps {
  readonly tipo: TipoPdf;
  readonly etiqueta: string;
  readonly ayuda?: string;
  readonly textoAdjuntar: string;
  /** Adjuntos de este tipo (se muestra el primero vigente). */
  readonly adjuntos: readonly Adjunto[];
  readonly maxMB: number;
  readonly soloLectura?: boolean;
  readonly onAgregar: (archivo: File, tipo: TipoPdf) => Promise<AgregarPdfResultado>;
  readonly onEliminar: (adjuntoId: string) => Promise<void>;
}

const CLAVE_ERROR = {
  NO_ES_PDF: 'pdf.noEsPdf',
  TAMANO_EXCEDIDO: 'pdf.tamanoExcedido',
  ALMACENAMIENTO_LLENO: 'pdf.almacenamientoLleno',
} as const;

/** Adjuntar / ver / reemplazar / eliminar el PDF de una etapa (HU-007-7). */
export function CampoPdf({
  tipo,
  etiqueta,
  ayuda,
  textoAdjuntar,
  adjuntos,
  maxMB,
  soloLectura = false,
  onAgregar,
  onEliminar,
}: CampoPdfProps): React.JSX.Element {
  const { t } = useTranslation('etapas');
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const actual = adjuntos.find((adjunto) => adjunto.tipo === tipo && !adjunto.eliminarRemoto);

  const agregar = async (archivo: File): Promise<void> => {
    setError(undefined);
    try {
      const resultado = await onAgregar(archivo, tipo);
      if (!resultado.ok) setError(t(CLAVE_ERROR[resultado.error], { maxMB }));
    } catch {
      setError(t('pdf.error'));
    }
  };

  const eliminar = async (adjuntoId: string): Promise<void> => {
    setError(undefined);
    try {
      await onEliminar(adjuntoId);
    } catch {
      setError(t('pdf.error'));
    }
  };

  return (
    <div className={styles.campo!}>
      <span className={styles.etiqueta!}>{etiqueta}</span>
      {ayuda ? <small className={styles.ayuda!}>{ayuda}</small> : null}

      {actual ? (
        <AdjuntoPdf
          adjunto={actual}
          readOnly={soloLectura}
          onReplace={(archivo) => void agregar(archivo)}
          onDelete={(adjuntoId) => void eliminar(adjuntoId)}
        />
      ) : soloLectura ? null : (
        <div className={styles.acciones!}>
          <input
            ref={entrada}
            className={styles.entrada!}
            type="file"
            accept="application/pdf,.pdf"
            aria-label={textoAdjuntar}
            tabIndex={-1}
            onChange={(evento) => {
              const archivo = evento.currentTarget.files?.[0];
              evento.currentTarget.value = '';
              if (archivo) void agregar(archivo);
            }}
          />
          <SecondaryButton onPress={() => entrada.current?.click()}>
            {textoAdjuntar}
          </SecondaryButton>
        </div>
      )}

      {error ? <Banner tipo="peligro">{error}</Banner> : null}
    </div>
  );
}
