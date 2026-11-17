import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CamposServicio, Servicio } from '@/domain/servicio';
import { esquemaRecepcion } from '@/domain/validaciones';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { DateChip } from '@/shared/ui/DateChip';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SelectField } from '@/shared/ui/SelectField';
import { TextField } from '@/shared/ui/TextField';

import { CampoCliente } from './CampoCliente';
import { CampoMarca } from './CampoMarca';
import { useAutoguardado } from '../hooks/useAutoguardado';
import styles from './FormRecepcion.module.css';

interface BorradorForm {
  tipoEquipo: 'BATERIA' | 'CARGADOR';
  fechaRecepcion: string;
  clienteId: number;
  clienteNombre: string;
  marca: string;
  referencia: string;
  serie: string;
}

interface Props {
  readonly servicio: Servicio;
  readonly hoy: string;
  readonly totalFotos: number;
  readonly minFotos: number;
  readonly onGuardar: (cambios: Partial<CamposServicio>) => Promise<unknown>;
  readonly onCompletar: () => Promise<void>;
  readonly children?: React.ReactNode;
}

const desdeServicio = (servicio: Servicio): BorradorForm => ({
  tipoEquipo: servicio.tipoEquipo,
  fechaRecepcion: servicio.fechaRecepcion,
  clienteId: servicio.clienteId,
  clienteNombre: servicio.clienteNombre,
  marca: servicio.marca,
  referencia: servicio.referencia,
  serie: servicio.serie,
});

const aCambios = (datos: BorradorForm): Partial<CamposServicio> => ({
  tipoEquipo: datos.tipoEquipo,
  fechaRecepcion: datos.fechaRecepcion,
  clienteId: datos.clienteId,
  clienteNombre: datos.clienteNombre,
  marca: datos.marca,
  referencia: datos.referencia,
  serie: datos.serie,
});

export function FormRecepcion({
  servicio,
  hoy,
  totalFotos,
  minFotos,
  onGuardar,
  onCompletar,
  children,
}: Props): React.JSX.Element {
  const { t } = useTranslation(['servicios', 'common', 'errores']);
  const traducirError = (clave: string): string =>
    clave.startsWith('errores.') ? t(`errores:${clave.slice('errores.'.length)}`) : t(clave);
  const [datos, setDatos] = useState(() => desdeServicio(servicio));
  const [intento, setIntento] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [errorCompletar, setErrorCompletar] = useState<string>();
  const { estado, programar, cancelar } = useAutoguardado(onGuardar);

  const actualizar = (cambios: Partial<BorradorForm>): void => {
    const siguientes = { ...datos, ...cambios };
    setDatos(siguientes);
    programar(aCambios(siguientes));
  };

  const validacion = esquemaRecepcion(hoy).safeParse(aCambios(datos));
  const errores = new Map<string, string>();
  if (!validacion.success) {
    for (const issue of validacion.error.issues) {
      errores.set(String(issue.path[0]), traducirError(issue.message));
    }
  }
  if (totalFotos < minFotos) {
    errores.set('fotos', t('adjuntos:minimo', { minimo: minFotos }));
  }

  const faltantes = [...errores.values()];
  const puedeCompletar = faltantes.length === 0 && !completando;

  const completar = async (): Promise<void> => {
    setIntento(true);
    setErrorCompletar(undefined);
    if (!puedeCompletar) return;
    setCompletando(true);
    cancelar();
    try {
      await onGuardar(aCambios(datos));
      await onCompletar();
    } catch {
      setErrorCompletar(t('servicios:recepcion.errorGuardado'));
      setCompletando(false);
    }
  };

  return (
    <form
      className={styles.formulario!}
      onSubmit={(evento) => {
        evento.preventDefault();
        void completar();
      }}
    >
      <div className={styles.columnas!}>
        <Card fill>
          <h3>{t('servicios:detalle.recepcion')}</h3>
          <SelectField
            etiqueta={t('servicios:recepcion.tipoEquipo')}
            items={[
              { id: 'BATERIA', texto: t('servicios:recepcion.bateria') },
              { id: 'CARGADOR', texto: t('servicios:recepcion.cargador') },
            ]}
            selectedKey={datos.tipoEquipo}
            onSelectionChange={(clave) => {
              if (clave) actualizar({ tipoEquipo: String(clave) as 'BATERIA' | 'CARGADOR' });
            }}
            error={intento ? errores.get('tipoEquipo') : undefined}
          />
          <DateChip
            id="fecha-recepcion"
            etiqueta={t('servicios:recepcion.fechaRecepcion')}
            valor={datos.fechaRecepcion}
            max={hoy}
            onCambio={(valor) => actualizar({ fechaRecepcion: valor })}
            error={intento ? errores.get('fechaRecepcion') : undefined}
          />
          <CampoCliente
            clienteId={datos.clienteId}
            clienteNombre={datos.clienteNombre}
            onCambio={(id, nombre) => actualizar({ clienteId: id, clienteNombre: nombre })}
            error={intento ? errores.get('clienteId') : undefined}
          />
          <p className={styles.nota!}>{t('servicios:recepcion.numeroPendienteAyuda')}</p>
        </Card>

        <Card fill>
          <h3>{t('servicios:detalle.equipo')}</h3>
          <CampoMarca
            valor={datos.marca}
            onCambio={(marca) => actualizar({ marca })}
            error={intento ? errores.get('marca') : undefined}
          />
          <TextField
            id="referencia"
            etiqueta={t('servicios:recepcion.referencia')}
            ayuda={t('servicios:recepcion.referenciaAyuda')}
            value={datos.referencia}
            autoCapitalize="characters"
            error={intento ? errores.get('referencia') : undefined}
            onChange={(valor) => actualizar({ referencia: valor })}
          />
          <TextField
            id="serie"
            etiqueta={t('servicios:recepcion.serie')}
            ayuda={t('servicios:recepcion.serieAyuda')}
            value={datos.serie}
            autoCapitalize="characters"
            error={intento ? errores.get('serie') : undefined}
            onChange={(valor) => actualizar({ serie: valor })}
          />
        </Card>
      </div>

      {children}

      {intento && faltantes.length > 0 ? (
        <Banner tipo="advertencia">
          <strong>{t('servicios:recepcion.faltantes')}</strong>
          <ul className={styles.faltantes!}>
            {faltantes.map((faltante, indice) => (
              <li key={`${faltante}-${indice}`}>{faltante}</li>
            ))}
          </ul>
        </Banner>
      ) : null}
      {errorCompletar ? <Banner tipo="peligro">{errorCompletar}</Banner> : null}

      <div className={styles.pie!}>
        <span className={styles.estadoGuardado!} role="status">
          {estado === 'guardando'
            ? t('servicios:recepcion.guardando')
            : estado === 'guardado'
              ? t('servicios:recepcion.guardado')
              : estado === 'error'
                ? t('servicios:recepcion.errorGuardado')
                : ''}
        </span>
        <PrimaryButton type="submit" isDisabled={completando}>
          {completando ? t('servicios:recepcion.guardando') : t('servicios:recepcion.completar')}
        </PrimaryButton>
      </div>
    </form>
  );
}
