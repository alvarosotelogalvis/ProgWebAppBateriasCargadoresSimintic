import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { detectarSerieDuplicada } from '@/application/servicios/buscarServicios';
import { AdjuntosEtapa } from '@/features/adjuntos/components/AdjuntosEtapa';
import { FormRecepcion } from '@/features/servicios/components/FormRecepcion';
import { useAdjuntos, useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { AvisoAlmacenamiento } from '@/shared/ui/AvisoAlmacenamiento';
import { Banner } from '@/shared/ui/Banner';
import { TextLink } from '@/shared/ui/TextLink';

export function EtapaRecepcionPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation('servicios');
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const adjuntos = useAdjuntos(id);
  const roles = useSesionStore((estado) => estado.roles);
  const [duplicado, setDuplicado] = useState<string>();

  useEffect(() => {
    if (!servicio) return;
    let vigente = true;
    void detectarSerieDuplicada(
      (serie) => container.servicios.buscarPorSerie(serie),
      servicio.id,
      servicio.serie,
      servicio.numeroSolicitud
    ).then((encontrado) => {
      if (vigente) setDuplicado(encontrado?.id);
    });
    return () => {
      vigente = false;
    };
  }, [container.servicios, servicio]);

  if (!servicio) return <p role="status">{t('detalle.noEncontrado')}</p>;

  const fotos = adjuntos.filter((adjunto) => adjunto.tipo === 'FOTO_INGRESO');
  const { minFotosIngreso } = container.config();

  return (
    <div>
      <header>
        <h1>{t('recepcion.titulo')}</h1>
        <p>{t('recepcion.subtitulo')}</p>
      </header>

      <AvisoAlmacenamiento />

      {duplicado ? (
        <Banner
          tipo="advertencia"
          accion={
            <TextLink onPress={() => navigate(`/servicios/${duplicado}`)}>
              {t('recepcion.verExistente')}
            </TextLink>
          }
        >
          {t('recepcion.duplicada')}
        </Banner>
      ) : null}

      <FormRecepcion
        servicio={servicio}
        hoy={new Date().toLocaleDateString('en-CA')}
        totalFotos={fotos.length}
        minFotos={minFotosIngreso}
        onGuardar={(cambios) => container.casosDeUso.actualizarCampos(servicio.id, cambios, roles)}
        onCompletar={async () => {
          await container.casosDeUso.completarEtapa(servicio.id, 'completarRecepcion', roles);
          navigate(`/servicios/${servicio.id}`, { replace: true });
        }}
      >
        <AdjuntosEtapa
          servicioId={servicio.id}
          tipo="FOTO_INGRESO"
          adjuntos={fotos}
          minimo={minFotosIngreso}
          maximo={container.config().maxFotosIngreso}
          onAgregar={(archivo) =>
            container.casosAdjuntos.agregarFoto(servicio.id, archivo, 'FOTO_INGRESO')
          }
          onEliminar={(adjuntoId) => container.casosAdjuntos.eliminarAdjunto(adjuntoId)}
        />
      </FormRecepcion>
    </div>
  );
}
