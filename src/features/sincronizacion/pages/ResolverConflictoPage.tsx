import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import type { Eleccion } from '@/application/servicios/resolverConflictos';
import type { CamposServicio } from '@/domain/servicio';
import { useServicio } from '@/infrastructure/db/hooks';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TablaResponsive } from '@/shared/ui/TablaResponsive';

import { CampoConflicto, type OrigenValor } from '../components/CampoConflicto';
import { etiquetaCampo, formatearValorCampo } from '../etiquetasCampos';
import styles from './ResolverConflictoPage.module.css';

interface FilaConflicto {
  readonly id: string;
  readonly campo: string;
  readonly local: string;
  readonly remoto: string;
  readonly eleccion: string;
}

/** Pantalla «Resolver conflicto» (UX §3.9): un valor por campo, «Mi valor» o «SharePoint». */
export function ResolverConflictoPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation('sync');
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const breakpoint = useBreakpoint();
  const [elecciones, setElecciones] = useState<ReadonlyMap<keyof CamposServicio, OrigenValor>>(
    new Map()
  );
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState(false);

  if (!servicio || servicio.conflictos.length === 0) {
    return <EmptyState titulo={t('conflictos.sinConflictos')} icono="verificado" />;
  }

  const conflictos = servicio.conflictos;
  const todasElegidas = conflictos.every((conflicto) => elecciones.has(conflicto.campo));
  const eliminadoRemoto = conflictos.some(
    (conflicto) => conflicto.campo === 'estado' && conflicto.remoto === undefined
  );

  const elegir = (campo: keyof CamposServicio, valor: OrigenValor): void => {
    setElecciones((actuales) => new Map(actuales).set(campo, valor));
  };

  const aplicar = async (): Promise<void> => {
    setAplicando(true);
    setError(false);
    try {
      const lista: Eleccion[] = conflictos.map((conflicto) => ({
        campo: conflicto.campo,
        usar: elecciones.get(conflicto.campo) ?? 'LOCAL',
      }));
      await container.casosDeUso.resolverConflictos(servicio.id, lista);
      navigate('/sincronizacion', { replace: true });
    } catch {
      setError(true);
    } finally {
      setAplicando(false);
    }
  };

  const filas: FilaConflicto[] = conflictos.map((conflicto) => ({
    id: conflicto.campo,
    campo: etiquetaCampo(t, conflicto.campo),
    local: formatearValorCampo(t, conflicto.campo, conflicto.local),
    remoto: formatearValorCampo(t, conflicto.campo, conflicto.remoto),
    eleccion: '',
  }));

  return (
    <div className={styles.pagina!}>
      <Card fill>
        <h2>{t('conflictos.titulo')}</h2>
        <p className={styles.resumen!}>
          {servicio.codigo} · {servicio.clienteNombre}
        </p>
        {eliminadoRemoto ? <Banner tipo="advertencia">{t('conflictos.eliminado')}</Banner> : null}
        <TablaResponsive
          etiqueta={t('conflictos.titulo')}
          datos={filas}
          breakpoint={
            breakpoint === 'expandido' || breakpoint === 'amplio' ? 'expanded' : 'compact'
          }
          columnas={[
            { clave: 'campo', etiqueta: t('conflictos.columna.campo') },
            { clave: 'local', etiqueta: t('conflictos.campo.miValor') },
            { clave: 'remoto', etiqueta: t('conflictos.campo.sharepoint') },
            {
              clave: 'eleccion',
              etiqueta: t('conflictos.columna.eleccion'),
              celda: (fila) => (
                <CampoConflicto
                  etiqueta={fila.campo}
                  seleccion={elecciones.get(fila.id as keyof CamposServicio)}
                  onChange={(valor) => elegir(fila.id as keyof CamposServicio, valor)}
                />
              ),
            },
          ]}
        />
        {error ? <Banner tipo="peligro">{t('conflictos.error')}</Banner> : null}
        {!todasElegidas ? <p className={styles.ayuda!}>{t('conflictos.validacion')}</p> : null}
        <PrimaryButton isDisabled={!todasElegidas || aplicando} onPress={() => void aplicar()}>
          {t('conflictos.boton')}
        </PrimaryButton>
      </Card>
    </div>
  );
}
