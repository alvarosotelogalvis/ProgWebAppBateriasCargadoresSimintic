import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useContainer } from '@/app/containerContext';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { esClienteTemporal } from '@/domain/cliente';
import { useCatalogo } from '@/infrastructure/db/hooks';
import { useOnline } from '@/shared/hooks/useOnline';
import { AppError } from '@/shared/errors';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { ComboboxField } from '@/shared/ui/ComboboxField';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

import { FusionarClientesDialog } from './FusionarClientesDialog';
import styles from './MenuTecnicoPage.module.css';

interface Seleccion {
  readonly id: number | null;
  readonly nombre: string;
}

const SIN_SELECCION: Seleccion = { id: null, nombre: '' };

const esErrorDeRed = (causa: unknown): boolean =>
  causa instanceof AppError &&
  (causa.codigo === 'RED_SIN_CONEXION' || causa.codigo === 'SIN_CONEXION');

/**
 * Fusión de clientes (solo Administrador, con conexión — ADR-0023). Elige el cliente que se fusiona y el que
 * se conserva; los servicios del primero pasan al segundo y el primero se conserva como historial.
 */
export function ClientesPage(): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const { casosClientes } = useContainer();
  const roles = useSesionStore((estado) => estado.roles);
  const enLinea = useOnline();
  const catalogo = useCatalogo<readonly ClienteCatalogo[]>(CLAVES_CATALOGO.clientes) ?? [];

  const [origen, setOrigen] = useState<Seleccion>(SIN_SELECCION);
  const [destino, setDestino] = useState<Seleccion>(SIN_SELECCION);
  const [dialogo, setDialogo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [avance, setAvance] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!roles.includes('Administrador')) {
    return (
      <div className={styles.pagina!}>
        <Banner tipo="info">{t('solo_admin')}</Banner>
      </div>
    );
  }

  // Los clientes creados sin red que aún no están en SharePoint (id temporal) no se pueden fusionar.
  const items = catalogo
    .filter((cliente) => cliente.activo && !esClienteTemporal(cliente.id))
    .map((cliente) => ({ id: String(cliente.id), texto: cliente.nombre }));

  const mismos = origen.id !== null && origen.id === destino.id;
  const listos = origen.id !== null && destino.id !== null && !mismos;

  const fusionar = async (): Promise<void> => {
    if (origen.id === null || destino.id === null) return;
    setProcesando(true);
    setAvance(null);
    setError(null);
    setResultado(null);
    try {
      const fusion = await casosClientes.fusionarClientes({
        origenId: origen.id,
        destinoId: destino.id,
        roles,
        onProgreso: (hechos, total) => setAvance({ hechos, total }),
      });
      const mensaje = t('clientes.resultado', { count: fusion.reasignados });
      setResultado(
        fusion.destinoId === destino.id
          ? mensaje
          : `${t('clientes.destino_fusionado', { nombre: destino.nombre, vigente: fusion.destinoNombre })} ${mensaje}`
      );
      setOrigen(SIN_SELECCION);
      setDestino(SIN_SELECCION);
    } catch (causa) {
      setError(esErrorDeRed(causa) ? t('clientes.sin_conexion') : t('clientes.error'));
    } finally {
      setProcesando(false);
      setDialogo(false);
    }
  };

  return (
    <div className={styles.pagina!}>
      <h1>{t('clientes.titulo')}</h1>
      <p>{t('clientes.descripcion')}</p>

      <Card fill>
        {resultado ? <Banner tipo="exito">{resultado}</Banner> : null}
        {error ? <Banner tipo="peligro">{error}</Banner> : null}
        {!enLinea ? <Banner tipo="advertencia">{t('clientes.sin_conexion')}</Banner> : null}

        {items.length === 0 ? (
          <Banner tipo="info">{t('clientes.sin_clientes')}</Banner>
        ) : (
          <>
            <ComboboxField
              etiqueta={t('clientes.origen')}
              valor={origen.nombre}
              items={items}
              onCambio={(_, opcion) => {
                if (opcion) setOrigen({ id: Number(opcion.id), nombre: opcion.texto });
              }}
            />
            <ComboboxField
              etiqueta={t('clientes.destino')}
              valor={destino.nombre}
              items={items}
              onCambio={(_, opcion) => {
                if (opcion) setDestino({ id: Number(opcion.id), nombre: opcion.texto });
              }}
            />
            {mismos ? <Banner tipo="advertencia">{t('clientes.misma_seleccion')}</Banner> : null}
            <PrimaryButton
              isDisabled={!listos || !enLinea || procesando}
              onPress={() => {
                setError(null);
                setResultado(null);
                setDialogo(true);
              }}
            >
              {t('clientes.fusionar')}
            </PrimaryButton>
          </>
        )}
      </Card>

      <FusionarClientesDialog
        abierto={dialogo}
        origen={origen.nombre}
        destino={destino.nombre}
        procesando={procesando}
        avance={avance}
        onConfirmar={() => void fusionar()}
        onCerrar={() => setDialogo(false)}
      />
    </div>
  );
}
