import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { ReactNode } from 'react';

import { useBreakpoint } from '@/shared/hooks/useBreakpoint';

import styles from './ResponsiveDialog.module.css';

interface Props {
  readonly titulo: string;
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly children: ReactNode;
}

/**
 * Compacto: hoja inferior con asa. Medio/expandido: ventana modal centrada (max. 560 px).
 * FR-001-18.
 */
export function ResponsiveDialog({
  titulo,
  abierto,
  onCerrar,
  children,
}: Props): React.JSX.Element {
  const breakpoint = useBreakpoint();
  const esHoja = breakpoint === 'compacto';
  const claseOverlay = esHoja ? styles.overlayHoja! : styles.overlay!;
  const claseModal = esHoja ? styles.hoja! : styles.modal!;

  return (
    <ModalOverlay
      isOpen={abierto}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onCerrar();
      }}
      className={claseOverlay}
    >
      <Modal className={claseModal} aria-label={titulo}>
        {esHoja ? <span className={styles.asa!} aria-hidden="true" /> : null}
        <Dialog className={styles.dialogo!} aria-label={titulo}>
          <header className={styles.cabecera!}>
            <h2 className={styles.titulo!}>{titulo}</h2>
            <button type="button" className={styles.cerrar!} onClick={onCerrar} aria-label="Cerrar">
              ✕
            </button>
          </header>
          <div className={styles.contenido!}>{children}</div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
