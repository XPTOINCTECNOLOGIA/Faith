import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

/**
 * Storage de documentos: bucket privado `opp-documents` no Supabase Storage
 * (S3-compatível). A service-role key vive SOMENTE no backend; o navegador só
 * recebe URLs assinadas expiráveis (RN-011).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  readonly bucket: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('SUPABASE_URL') ?? '';
    this.serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    this.bucket = config.get<string>('STORAGE_BUCKET') ?? 'opp-documents';
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      Authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
      ...extra,
    };
  }

  buildPath(opportunityId: number, documentId: number, version: number, fileName: string): string {
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    return `opp-${opportunityId}/doc-${documentId}/v${version}-${randomUUID()}${ext}`;
  }

  async upload(path: string, buffer: Buffer, mimeType: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': mimeType }),
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      this.logger.error(`Upload falhou (${res.status}): ${await res.text()}`);
      throw new InternalServerErrorException('Falha ao armazenar o arquivo');
    }
  }

  /** URL assinada e expirável (download auditado no chamador). */
  async signedUrl(path: string, expiresInSeconds = 300): Promise<string> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/sign/${this.bucket}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!res.ok) {
      this.logger.error(`Assinatura falhou (${res.status}): ${await res.text()}`);
      throw new InternalServerErrorException('Falha ao gerar URL de download');
    }
    const data = (await res.json()) as { signedURL: string };
    return `${this.baseUrl}/storage/v1${data.signedURL}`;
  }
}
