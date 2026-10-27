import { http, HttpResponse, type HttpHandler } from 'msw';
import { EmuladorGraph as EmuladorGraphBase } from './emulador';

export type { ItemEmulado, ListaEmulada, OpcionesEmulador } from './emulador';

export interface FallaInyectable {
  readonly status: number;
  readonly headers?: Record<string, string>;
}

export interface OpcionesEmuladorGraph {
  readonly baseUrl?: string;
  readonly host?: string;
  readonly siteId?: string;
  readonly sitePath?: string;
  readonly webUrl?: string;
  readonly driveId?: string;
  readonly listas?: readonly any[];
  readonly tamanoPagina?: number;
}

export class EmuladorGraph extends (EmuladorGraphBase as any) {
  private readonly fallas: FallaInyectable[] = [];
  private bytesHastaCorte: number | null = null;
  private bytesEnviados = 0;
  private forzarEtagMismatch = false;

  constructor(opciones: OpcionesEmuladorGraph = {}) {
    super(opciones as any);
  }

  failNext(status: number, headers?: Record<string, string>): void {
    this.fallas.push({ status, headers });
  }

  dropConnectionAfter(bytes: number): void {
    this.bytesHastaCorte = bytes;
    this.bytesEnviados = 0;
  }

  etagMismatch(): void {
    this.forzarEtagMismatch = true;
  }

  handlers(): HttpHandler[] {
    const baseHandlers = (super.handlers as any)();
    const baseUrl = (this as any).baseUrl ?? 'https://graph.microsoft.com/v1.0';
    const driveId = (this as any).driveId ?? 'drive-1';

    const uploadHandlers: HttpHandler[] = [
      http.put(${baseUrl}/drives/*/items/*:/content, async () => {
        const fallo = this.fallas.shift();
        if (fallo !== undefined) {
          return HttpResponse.json({ error: { code: 'emulado', message: 'fallo' } }, { status: fallo.status, headers: fallo.headers as any });
        }
        return HttpResponse.json({ id: 'item-up', '@odata.etag': '"etag1"' }, { status: 201 });
      }),
      http.post(${baseUrl}/drives/*/items/*:/createUploadSession, async () => {
        const fallo = this.fallas.shift();
        if (fallo !== undefined) {
          return HttpResponse.json({ error: { code: 'emulado', message: 'fallo' } }, { status: fallo.status, headers: fallo.headers as any });
        }
        return HttpResponse.json({
          uploadUrl: ${baseUrl}/drives//uploadSession/test-session,
          expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
        });
      }),
      http.put(${baseUrl}/drives/*/uploadSession/*, async ({ request }) => {
        if (this.bytesHastaCorte !== null) {
          const body = await request.arrayBuffer();
          this.bytesEnviados += body.byteLength;
          if (this.bytesEnviados >= this.bytesHastaCorte) {
            this.bytesHastaCorte = null;
            return HttpResponse.error();
          }
        }
        const fallo = this.fallas.shift();
        if (fallo !== undefined) {
          return HttpResponse.json({ error: { code: 'emulado', message: 'fallo' } }, { status: fallo.status, headers: fallo.headers as any });
        }
        return HttpResponse.json({ id: 'item-up', '@odata.etag': '"etag1"' }, { status: 200 });
      }),
      http.patch(${baseUrl}/sites/*/lists/*/items/*/fields, async () => {
        const fallo = this.fallas.shift();
        if (fallo !== undefined) {
          return HttpResponse.json({ error: { code: 'emulado', message: 'fallo' } }, { status: fallo.status, headers: fallo.headers as any });
        }
        if (this.forzarEtagMismatch) {
          this.forzarEtagMismatch = false;
          return HttpResponse.json({ error: { code: 'preconditionFailed', message: 'etag mismatch' } }, { status: 412 });
        }
        return HttpResponse.json({}, { status: 200 });
      }),
      http.post(${baseUrl}/sites/*/lists/*/items, async () => {
        const fallo = this.fallas.shift();
        if (fallo !== undefined) {
          return HttpResponse.json({ error: { code: 'emulado', message: 'fallo' } }, { status: fallo.status, headers: fallo.headers as any });
        }
        return HttpResponse.json({ id: 'new-item', fields: {} }, { status: 201 });
      }),
    ];

    return [...baseHandlers, ...uploadHandlers];
  }
}

export default EmuladorGraph;
