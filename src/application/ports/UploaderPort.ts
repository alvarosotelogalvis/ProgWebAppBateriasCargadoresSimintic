export interface SubidaResultado {
  readonly id: string;
  readonly etag?: string;
}

export interface UploadOptions {
  readonly onProgress?: (bytesEnviados: number, bytesTotales: number) => void;
  readonly signal?: AbortSignal;
}

export interface UploadSessionInfo {
  readonly uploadUrl: string;
  readonly expirationDateTime: string;
}
