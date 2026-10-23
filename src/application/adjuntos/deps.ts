import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { ImageProcessor } from '@/application/ports/imageProcessor';
import type { StoragePort } from '@/application/ports/storagePort';
import type { DepsServicios } from '@/application/servicios/deps';

export interface DepsAdjuntos extends DepsServicios {
  adjuntos: AdjuntoRepository;
  imageProcessor: ImageProcessor;
  storage: StoragePort;
}
