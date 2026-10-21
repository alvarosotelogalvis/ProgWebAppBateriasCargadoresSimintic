import { I18nProvider } from 'react-aria-components';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';

import i18n from '@/shared/i18n';

interface Props {
  readonly children: ReactNode;
}

export function Proveedores({ children }: Props): React.JSX.Element {
  return (
    <I18nextProvider i18n={i18n}>
      <I18nProvider locale="es-CO">{children}</I18nProvider>
    </I18nextProvider>
  );
}
