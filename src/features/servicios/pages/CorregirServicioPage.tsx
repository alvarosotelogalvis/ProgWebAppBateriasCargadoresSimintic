import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { ValidacionError } from '@/domain/errores';
import { camposEditables } from '@/domain/estados';
import type { CamposServicio, EstadoCotizacion } from '@/domain/servicio';
import { useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { DateChip } from '@/shared/ui/DateChip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import CampoDiagnostico from '../components/CampoDiagnostico';
import { CampoCliente } from '../components/CampoCliente';
import CampoMoneda from '../components/CampoMoneda';
import { FaltantesEtapa } from '../components/FaltantesEtapa';
import { SECCIONES_CORREGIBLES, type DefinicionCampo } from '../camposCorregibles';
import styles from './EtapaPage.module.css';

type Cambios = Partial<CamposServicio>;

/** Corrección de datos por el Administrador, sin cambiar el estado (HU-007-8). */
export function CorregirServicioPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios', 'errores']);
  const navigate = useNavigate();
  const { casosDeUso } = useContainer();
  const servicio = useServicio(id);
  const roles = useSesionStore((estado) => estado.roles);

  const [cambios, setCambios] = useState<Cambios>({});
  const [guardando, setGuardando] = useState(false);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string>();

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const editables = camposEditables(servicio, roles);
  const secciones = SECCIONES_CORREGIBLES.map((seccion) => ({
    ...seccion,
    campos: seccion.campos.filter((definicion) => editables.has(definicion.campo)),
  })).filter((seccion) => seccion.campos.length > 0);
  const hoy = new Date().toLocaleDateString('en-CA');
  const hayCambios = Object.keys(cambios).length > 0;

  const traducir = (clave: string): string => {
    if (clave.startsWith('errores.')) return t(`errores:${clave.slice('errores.'.length)}`);
    if (clave.startsWith('etapas.')) return t(`etapas:${clave.slice('etapas.'.length)}`);
    return t(clave);
  };

  const guardar = async (): Promise<void> => {
    setProblemas([]);
    setErrorGeneral(undefined);
    setGuardando(true);
    try {
      await casosDeUso.corregirCampos(servicio.id, cambios, roles);
      navigate(`/servicios/${servicio.id}`, { replace: true });
    } catch (error) {
      if (error instanceof ValidacionError) {
        setProblemas([...new Set(error.errores.map((falla) => traducir(falla.clave)))]);
      } else {
        setErrorGeneral(t('etapas:corregir.error'));
      }
      setGuardando(false);
    }
  };

  const valor = <K extends keyof CamposServicio>(campo: K): CamposServicio[K] =>
    (cambios[campo] ?? servicio[campo]) as CamposServicio[K];
  const cambiar = (parciales: Cambios): void => setCambios({ ...cambios, ...parciales });

  const renderCampo = ({ campo, tipo, etiqueta }: DefinicionCampo): React.JSX.Element => {
    const texto = t(etiqueta);
    switch (tipo) {
      case 'texto':
      case 'multilinea':
        return (
          <TextField
            key={campo}
            id={`corregir-${campo}`}
            etiqueta={texto}
            multilinea={tipo === 'multilinea'}
            value={String(valor(campo) ?? '')}
            onChange={(nuevo) => cambiar({ [campo]: nuevo })}
          />
        );
      case 'numero':
        return (
          <TextField
            key={campo}
            id={`corregir-${campo}`}
            etiqueta={texto}
            inputMode="numeric"
            value={String(valor(campo) ?? '')}
            onChange={(nuevo) => {
              const digitos = nuevo.replace(/\D/g, '');
              cambiar({ [campo]: digitos ? Number(digitos) : 0 });
            }}
          />
        );
      case 'fecha':
      case 'fechaFutura':
        return (
          <DateChip
            key={campo}
            id={`corregir-${campo}`}
            etiqueta={texto}
            valor={String(valor(campo) ?? '')}
            max={tipo === 'fecha' ? hoy : undefined}
            onCambio={(nuevo) => cambiar({ [campo]: nuevo })}
          />
        );
      case 'monto':
        return (
          <CampoMoneda
            key={campo}
            label={texto}
            valor={Number(valor(campo) ?? 0)}
            onChange={(monto) => cambiar({ [campo]: monto })}
          />
        );
      case 'diagnostico':
        return (
          <CampoDiagnostico
            key={campo}
            valor={String(valor('diagnostico') ?? '')}
            onChange={(nuevo) => cambiar({ diagnostico: nuevo })}
          />
        );
      case 'respuesta':
        return (
          <div key={campo}>
            <span>{texto}</span>
            <SegmentedControl
              aria-label={texto}
              selectedKey={valor('cotizacionEstado') ?? 'PENDIENTE'}
              onChange={(nueva) => cambiar({ cotizacionEstado: nueva as EstadoCotizacion })}
              items={[
                { id: 'PENDIENTE', etiqueta: t('etapas:cotizacion.respuestaPendiente') },
                { id: 'APROBADA', etiqueta: t('etapas:cotizacion.respuestaAprobada') },
                { id: 'RECHAZADA', etiqueta: t('etapas:cotizacion.respuestaRechazada') },
              ]}
            />
          </div>
        );
      case 'tipoEquipo':
        return (
          <div key={campo}>
            <span>{texto}</span>
            <SegmentedControl
              aria-label={texto}
              selectedKey={valor('tipoEquipo')}
              onChange={(nuevo) => cambiar({ tipoEquipo: nuevo as CamposServicio['tipoEquipo'] })}
              items={[
                { id: 'BATERIA', etiqueta: t('servicios:recepcion.bateria') },
                { id: 'CARGADOR', etiqueta: t('servicios:recepcion.cargador') },
              ]}
            />
          </div>
        );
      case 'cliente':
        return (
          <CampoCliente
            key={campo}
            clienteId={valor('clienteId')}
            clienteNombre={valor('clienteNombre')}
            onCambio={(clienteId, clienteNombre) => cambiar({ clienteId, clienteNombre })}
          />
        );
    }
  };

  return (
    <form
      className={styles.formulario!}
      onSubmit={(evento) => {
        evento.preventDefault();
        if (hayCambios) void guardar();
      }}
    >
      <header>
        <h1>{t('etapas:corregir.titulo')}</h1>
        <p>{t('etapas:corregir.subtitulo')}</p>
      </header>

      {secciones.length === 0 ? (
        <EmptyState titulo={t('etapas:corregir.sinCampos')} icono="servicios" />
      ) : (
        secciones.map((seccion) => (
          <Card key={seccion.id} fill>
            <h2>{t(seccion.titulo)}</h2>
            <div className={styles.campos!}>{seccion.campos.map(renderCampo)}</div>
          </Card>
        ))
      )}

      {problemas.length > 0 ? (
        <Banner tipo="peligro">
          {t('etapas:corregir.revisar')}
          <FaltantesLista items={problemas} />
        </Banner>
      ) : null}
      <FaltantesEtapa faltantes={[]} error={errorGeneral} />

      <div className={styles.pie!}>
        <span />
        <div className={styles.acciones!}>
          <SecondaryButton onPress={() => navigate(`/servicios/${servicio.id}`)}>
            {t('etapas:cancelar')}
          </SecondaryButton>
          <PrimaryButton type="submit" isDisabled={!hayCambios || guardando}>
            {t('etapas:corregir.guardar')}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
}

function FaltantesLista({ items }: { readonly items: readonly string[] }): React.JSX.Element {
  return (
    <ul className={styles.faltantes!}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
