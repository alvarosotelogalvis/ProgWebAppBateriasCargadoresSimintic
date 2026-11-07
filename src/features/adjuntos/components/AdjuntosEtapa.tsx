import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Adjunto } from '@/domain/adjunto';
import {
  AdjuntoDuplicadoError,
  AlmacenamientoLlenoError,
  FormatoImagenError,
  LimiteAdjuntosError,
} from '@/domain/errores';
import type { TipoAdjunto } from '@/domain/servicio';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { PhotoGallery } from '@/shared/ui/PhotoGallery';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { BotonesCaptura } from './BotonesCaptura';
import { CapturaWebcam } from './CapturaWebcam';
import { VisorImagen } from './VisorImagen';
import styles from './AdjuntosEtapa.module.css';

interface Props {
  readonly servicioId: string;
  readonly tipo?: TipoAdjunto;
  readonly adjuntos: readonly Adjunto[];
  readonly minimo: number;
  readonly maximo: number;
  readonly onAgregar: (archivo: File) => Promise<unknown>;
  readonly onEliminar: (adjuntoId: string) => Promise<unknown>;
}

export function AdjuntosEtapa({
  adjuntos,
  minimo,
  maximo,
  onAgregar,
  onEliminar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('adjuntos');
  const [progreso, setProgreso] = useState<{ actual: number; total: number }>();
  const [error, setError] = useState<string>();
  const [aEliminar, setAEliminar] = useState<Adjunto>();
  const [verIndice, setVerIndice] = useState<number>();
  const [webcamAbierta, setWebcamAbierta] = useState(false);
  const [punteroFino, setPunteroFino] = useState(false);

  const enMaximo = adjuntos.length >= maximo;
  const ocupado = Boolean(progreso);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const consulta = window.matchMedia('(pointer: fine)');
    setPunteroFino(consulta.matches);
    const manejar = (evento: MediaQueryListEvent): void => setPunteroFino(evento.matches);
    consulta.addEventListener('change', manejar);
    return () => consulta.removeEventListener('change', manejar);
  }, []);

  const mensajeError = (causa: unknown): string => {
    if (causa instanceof FormatoImagenError) return t('error.formato');
    if (causa instanceof AdjuntoDuplicadoError) return t('error.duplicada');
    if (causa instanceof LimiteAdjuntosError) return t('error.maximo');
    if (causa instanceof AlmacenamientoLlenoError) return t('error.almacenamiento');
    return t('error.desconocido');
  };

  const procesar = async (archivos: FileList | File[] | null): Promise<void> => {
    if (!archivos || archivos.length === 0) return;
    const lista = [...archivos].slice(0, Math.max(0, maximo - adjuntos.length));
    setError(undefined);
    for (let indice = 0; indice < lista.length; indice += 1) {
      setProgreso({ actual: indice + 1, total: lista.length });
      try {
        await onAgregar(lista[indice]!);
      } catch (causa) {
        setError(mensajeError(causa));
      }
    }
    setProgreso(undefined);
  };

  return (
    <Card fill>
      <div className={styles.cabecera!}>
        <div>
          <h3>{t('titulo')}</h3>
          <p className={styles.contador!}>{t('contador', { actual: adjuntos.length, maximo })}</p>
        </div>
        <BotonesCaptura
          deshabilitado={enMaximo || ocupado}
          permitirWebcam={punteroFino}
          onArchivos={(archivos) => void procesar(archivos)}
          onWebcam={() => setWebcamAbierta(true)}
        />
      </div>

      {progreso ? (
        <Banner tipo="info">
          {t('procesando', { actual: progreso.actual, total: progreso.total })}
        </Banner>
      ) : null}
      {error ? <Banner tipo="peligro">{error}</Banner> : null}
      {adjuntos.length < minimo ? (
        <Banner tipo="advertencia">{t('minimo', { minimo })}</Banner>
      ) : null}

      {adjuntos.length > 0 ? (
        <PhotoGallery
          adjuntos={adjuntos}
          onVer={(adjunto) => setVerIndice(adjuntos.findIndex((item) => item.id === adjunto.id))}
          onEliminar={setAEliminar}
        />
      ) : (
        <p className={styles.vacio!}>{t('agregar')}</p>
      )}

      <CapturaWebcam
        abierto={webcamAbierta}
        onCerrar={() => setWebcamAbierta(false)}
        onCapturar={(archivo) => void procesar([archivo])}
      />

      <VisorImagen
        adjuntos={adjuntos}
        indice={verIndice}
        onCambiarIndice={setVerIndice}
        onCerrar={() => setVerIndice(undefined)}
      />

      <ResponsiveDialog
        titulo={t('eliminarTitulo')}
        abierto={Boolean(aEliminar)}
        onCerrar={() => setAEliminar(undefined)}
      >
        <p>{t('eliminarTexto')}</p>
        <div className={styles.acciones!}>
          <SecondaryButton onPress={() => setAEliminar(undefined)}>
            {t('common:comun.cancelar')}
          </SecondaryButton>
          <PrimaryButton
            onPress={() => {
              if (!aEliminar) return;
              void onEliminar(aEliminar.id);
              setAEliminar(undefined);
              setVerIndice(undefined);
            }}
          >
            {t('eliminar')}
          </PrimaryButton>
        </div>
      </ResponsiveDialog>
    </Card>
  );
}
