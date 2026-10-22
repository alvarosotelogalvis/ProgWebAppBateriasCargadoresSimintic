import { useEffect, useState } from 'react';

export function useOnline(): boolean {
  const [enLinea, setEnLinea] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const alOnline = (): void => setEnLinea(true);
    const alOffline = (): void => setEnLinea(false);

    window.addEventListener('online', alOnline);
    window.addEventListener('offline', alOffline);

    return () => {
      window.removeEventListener('online', alOnline);
      window.removeEventListener('offline', alOffline);
    };
  }, []);

  return enLinea;
}
