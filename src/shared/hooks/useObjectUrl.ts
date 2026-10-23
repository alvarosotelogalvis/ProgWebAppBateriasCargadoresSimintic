import { useEffect, useState } from 'react';

export const useObjectUrl = (blob: Blob | null | undefined): string | undefined => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const creada = URL.createObjectURL(blob);
    setUrl(creada);
    return () => URL.revokeObjectURL(creada);
  }, [blob]);

  return url;
};
