/* eslint-disable no-restricted-syntax */
interface Props {
  readonly mensaje: string;
}

/**
 * Pantalla de error de configuracion (SDD 16.1). Se muestra cuando el build no tiene
 * las variables de entorno validas. Nunca se deja la app en blanco.
 */
export function PantallaErrorConfiguracion({ mensaje }: Props): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
      }}
    >
      <div role="alert" style={{ maxWidth: '32rem' }}>
        <h1>Configuracion invalida</h1>
        <p>
          Esta version de la app no se configuro correctamente. Contacta al administrador del
          sistema.
        </p>
        <pre
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            overflowX: 'auto',
            background: 'var(--surface-sunken)',
            borderRadius: 'var(--radio-md)',
            fontSize: '0.75rem',
          }}
        >
          {mensaje}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ marginTop: '1rem' }}
        >
          Recargar
        </button>
      </div>
    </main>
  );
}
