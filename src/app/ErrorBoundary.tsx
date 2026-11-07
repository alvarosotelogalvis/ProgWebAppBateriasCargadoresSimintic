/* eslint-disable no-restricted-syntax */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}

interface Estado {
  readonly error: Error | undefined;
}

export class ErrorBoundary extends Component<Props, Estado> {
  override state: Estado = { error: undefined };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado en la app', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Algo salió mal</h1>
        <p>Ocurrio un error inesperado. Tus datos locales siguen a salvo.</p>
        <button type="button" onClick={() => this.setState({ error: undefined })}>
          Intentar de nuevo
        </button>
      </div>
    );
  }
}
