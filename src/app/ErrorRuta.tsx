import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

import { EmptyState } from '@/shared/ui/EmptyState';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

/**
 * Pantalla de error de una ruta (render que falla, módulo que no carga sin conexión o URL
 * desconocida). Sustituye la pantalla por defecto del router: en español, sin trazas y con salida.
 */
export function ErrorRuta(): React.JSX.Element {
  const { t } = useTranslation('common');
  const error = useRouteError();
  const navegar = useNavigate();
  const noEncontrada = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!noEncontrada) console.error('Error en la ruta', error);
  }, [error, noEncontrada]);

  return (
    <div role="alert">
      <EmptyState
        icono="error"
        titulo={t(noEncontrada ? 'errorRuta.noEncontradaTitulo' : 'errorRuta.titulo')}
        descripcion={t(noEncontrada ? 'errorRuta.noEncontradaMensaje' : 'errorRuta.mensaje')}
        accion={
          <>
            <PrimaryButton onPress={() => navegar('/', { replace: true })}>
              {t('errorRuta.irInicio')}
            </PrimaryButton>
            {noEncontrada ? null : (
              <SecondaryButton onPress={() => window.location.reload()}>
                {t('errorRuta.reintentar')}
              </SecondaryButton>
            )}
          </>
        }
      />
    </div>
  );
}
