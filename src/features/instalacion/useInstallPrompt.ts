import { useEffect, useState } from 'react';

import { useUiStore } from '@/shared/stores/uiStore';

type ResultadoInstalacion = 'accepted' | 'dismissed' | 'no-disponible';

interface EventoInstallPrompt extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

let eventoCapturado: EventoInstallPrompt | undefined;

export function capturarInstallPrompt(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (evento: Event) => {
    evento.preventDefault();
    eventoCapturado = evento as EventoInstallPrompt;
    useUiStore.getState().setPromptInstalacionDisponible(true);
  });
}

export function puedeInstalar(): boolean {
  return useUiStore.getState().promptInstalacionDisponible;
}

export async function mostrarInstalacion(): Promise<ResultadoInstalacion> {
  if (!eventoCapturado) {
    return 'no-disponible';
  }

  await eventoCapturado.prompt();
  const eleccion = await eventoCapturado.userChoice;
  return eleccion.outcome;
}

export function useInstallPrompt(): {
  readonly puedeInstalar: boolean;
  readonly instalando: boolean;
  readonly resultado: ResultadoInstalacion | undefined;
  instalar(): Promise<void>;
} {
  const disponible = useUiStore((estado) => estado.promptInstalacionDisponible);
  const [instalando, setInstalando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoInstalacion | undefined>(undefined);

  useEffect(() => {
    capturarInstallPrompt();
  }, []);

  const instalar = async (): Promise<void> => {
    setInstalando(true);
    try {
      const salida = await mostrarInstalacion();
      setResultado(salida);
      if (salida === 'accepted') {
        useUiStore.getState().setPromptInstalacionDisponible(false);
      }
    } finally {
      setInstalando(false);
    }
  };

  return { puedeInstalar: disponible, instalando, resultado, instalar };
}
