import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useContainer } from '@/app/containerContext';
import { NombreClienteInvalidoError } from '@/application/clientes/agregarCliente';
import { normalizarNombre } from '@/domain/cliente';
import { useClientes } from '@/infrastructure/db/hooks';
import { Banner } from '@/shared/ui/Banner';
import { ComboboxField } from '@/shared/ui/ComboboxField';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from './CampoCliente.module.css';

interface Props {
  readonly clienteId: number;
  readonly clienteNombre: string;
  readonly onCambio: (id: number, nombre: string) => void;
  readonly error?: string | undefined;
}

/**
 * Cliente del servicio. Se elige de la lista (clientes de SharePoint y los creados en este dispositivo) y, si no
 * está, se puede escribir y agregar ahí mismo, sin red (ADR-0023). Si el nombre ya existe —ignorando tildes,
 * mayúsculas y espacios— se propone usar ese en vez de crear un duplicado.
 */
export function CampoCliente({
  clienteId,
  clienteNombre,
  onCambio,
  error,
}: Props): React.JSX.Element {
  const { t } = useTranslation(['servicios', 'common']);
  const { casosClientes } = useContainer();
  const clientes = useClientes();
  const [texto, setTexto] = useState(clienteNombre);
  const [errorAlta, setErrorAlta] = useState<string | undefined>(undefined);
  const [agregando, setAgregando] = useState(false);

  if (clientes.length === 0) {
    return <Banner tipo="advertencia">{t('servicios:recepcion.clienteVacio')}</Banner>;
  }

  const items = clientes
    .filter((cliente) => cliente.activo || cliente.id === clienteId)
    .map((cliente) => ({ id: String(cliente.id), texto: cliente.nombre }));
  const inactivo = clientes.some((cliente) => cliente.id === clienteId && !cliente.activo);

  const escrito = texto.trim();
  const hayTextoNuevo = escrito !== '' && escrito !== clienteNombre;
  const existente = hayTextoNuevo
    ? clientes.find(
        (cliente) =>
          cliente.activo && normalizarNombre(cliente.nombre) === normalizarNombre(escrito)
      )
    : undefined;

  const cambiarTexto = (nuevo: string): void => {
    setTexto(nuevo);
    setErrorAlta(undefined);
  };

  const agregar = async (): Promise<void> => {
    setAgregando(true);
    setErrorAlta(undefined);
    try {
      const resultado = await casosClientes.agregarCliente(escrito);
      onCambio(resultado.id, resultado.nombre);
      setTexto(resultado.nombre);
    } catch (causa) {
      if (causa instanceof NombreClienteInvalidoError) setErrorAlta(t(causa.claveI18n));
      else throw causa;
    } finally {
      setAgregando(false);
    }
  };

  return (
    <>
      <ComboboxField
        etiqueta={t('servicios:recepcion.cliente')}
        valor={clienteNombre}
        items={items}
        placeholder={t('servicios:recepcion.clienteBuscar')}
        ayuda={t('servicios:recepcion.clienteNuevoAyuda')}
        error={error}
        onTexto={cambiarTexto}
        onCambio={(_, opcion) => {
          if (opcion) onCambio(Number(opcion.id), opcion.texto);
        }}
      />
      {existente ? (
        <div className={styles.accion!}>
          <SecondaryButton onPress={() => onCambio(existente.id, existente.nombre)}>
            {t('servicios:recepcion.clienteSugerido', { nombre: existente.nombre })}
          </SecondaryButton>
        </div>
      ) : null}
      {hayTextoNuevo && !existente ? (
        <div className={styles.accion!}>
          <SecondaryButton isDisabled={agregando} onPress={() => void agregar()}>
            {t('servicios:recepcion.clienteAgregar', { nombre: escrito })}
          </SecondaryButton>
        </div>
      ) : null}
      {errorAlta ? (
        <p role="alert" className={styles.error!}>
          {errorAlta}
        </p>
      ) : null}
      {inactivo ? (
        <Banner tipo="advertencia">{t('servicios:recepcion.clienteInactivo')}</Banner>
      ) : null}
    </>
  );
}
