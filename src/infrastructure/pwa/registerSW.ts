const INTERVALO_MINUTOS = 60;

interface Opciones {
  readonly onNuevaVersion: () => void;
  readonly intervaloMs?: number;
}

export interface RegistroSW {
  aplicar(): Promise<void>;
}

let intervaloId: number | undefined;

/**
 * Registra el service worker con actualizacion controlada (registerType 'prompt').
 * La app no se recarga sola: avisa al usuario y espera a que no haya trabajo en curso.
 */
export function registrarServiceWorker({ onNuevaVersion, intervaloMs }: Opciones): RegistroSW {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { aplicar: async () => undefined };
  }

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registro) => {
    if (registro.waiting) {
      onNuevaVersion();
    }

    registro.addEventListener('updatefound', () => {
      const nuevo = registro.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          onNuevaVersion();
        }
      });
    });

    void registro.update();
    iniciarActualizacionPeriodica(registro, intervaloMs);
  });

  return {
    aplicar: async () => {
      const registro = await navigator.serviceWorker.getRegistration();
      await registro?.update();
      window.location.reload();
    },
  };
}

function iniciarActualizacionPeriodica(
  registro: ServiceWorkerRegistration,
  intervaloMs?: number
): void {
  if (intervaloId !== undefined) {
    window.clearInterval(intervaloId);
  }
  const intervalo = intervaloMs ?? INTERVALO_MINUTOS * 60 * 1000;
  intervaloId = window.setInterval(() => {
    void registro.update();
  }, intervalo);
}

/**
 * Fuerza la búsqueda de una nueva versión (`registration.update()`, SDD §11.4).
 * Si la hay, el flujo normal del SW muestra el aviso "Hay una nueva versión".
 */
export async function buscarActualizacion(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registro = await navigator.serviceWorker.getRegistration();
  await registro?.update();
}
