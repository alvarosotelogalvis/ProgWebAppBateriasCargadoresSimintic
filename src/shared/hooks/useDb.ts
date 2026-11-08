import { useContainer } from '@/app/containerContext';

export function useDb() {
  const container = useContainer();
  return container.db;
}
