import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/identity.service';
import {
  DocumentEntity,
  DocumentReviewEntity,
  DocumentVersionEntity,
} from '../entities/document.entities';
import { ChecklistItemEntity } from '../entities/opportunity.entities';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDocumentDto } from './documents.dto';
import { StorageService } from './storage.service';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  private readonly maxBytes: number;
  private readonly allowedExt: string[];

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    config: ConfigService,
  ) {
    this.maxBytes = Number(config.get('UPLOAD_MAX_MB') ?? 25) * 1024 * 1024;
    this.allowedExt = (config.get<string>('UPLOAD_ALLOWED_EXT') ?? 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip')
      .split(',')
      .map((e) => e.trim().toLowerCase());
  }

  /** RN-011: política de upload. */
  private validateFile(file: UploadedFile) {
    if (!file) throw new UnprocessableEntityException('Arquivo obrigatório (campo "file")');
    if (file.size > this.maxBytes) {
      throw new UnprocessableEntityException(`Arquivo excede o limite de ${this.maxBytes / 1024 / 1024} MB (RN-011)`);
    }
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!this.allowedExt.includes(ext)) {
      throw new UnprocessableEntityException(`Extensão .${ext} não permitida (RN-011): ${this.allowedExt.join(', ')}`);
    }
  }

  listByOpportunity(opportunityId: number) {
    return this.db.getRepository(DocumentEntity).find({
      where: { opportunityId },
      relations: { creator: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async getDocument(manager: EntityManager, id: number): Promise<DocumentEntity> {
    const doc = await manager.findOneBy(DocumentEntity, { id });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  /** UC-06: cria documento (v1) vinculado ou não a item de checklist. */
  async create(opportunityId: number, dto: CreateDocumentDto, file: UploadedFile, user: RequestUser) {
    this.validateFile(file);
    return this.db.transaction(async (manager) => {
      if (dto.checklistItemId) {
        const item = await manager.findOneBy(ChecklistItemEntity, { id: dto.checklistItemId });
        if (!item || item.opportunityId !== opportunityId) {
          throw new UnprocessableEntityException('Item de checklist não pertence à oportunidade');
        }
        if (item.documentId) {
          throw new ConflictException('Item já possui documento — envie nova versão nele');
        }
      }

      const doc = await manager.save(
        manager.create(DocumentEntity, {
          opportunityId,
          checklistItemId: dto.checklistItemId ?? null,
          name: dto.name,
          category: dto.category ?? null,
          docType: dto.docType ?? null,
          status: 'em_analise',
          currentVersion: 1,
          notes: dto.observacoes ?? null,
          createdBy: user.id,
        }),
      );

      const path = this.storage.buildPath(opportunityId, doc.id, 1, file.originalname);
      await this.storage.upload(path, file.buffer, file.mimetype);
      await manager.insert(DocumentVersionEntity, {
        documentId: doc.id,
        version: 1,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: path,
        observacoes: dto.observacoes ?? null,
        uploadedBy: user.id,
      });

      if (dto.checklistItemId) {
        await manager.update(ChecklistItemEntity, dto.checklistItemId, {
          documentId: doc.id,
          status: 'em_analise',
        });
      }

      await this.audit.log(manager, [
        { entity: 'document', entityId: doc.id, opportunityId, action: 'upload', newValue: file.originalname, actorId: user.id },
      ]);
      await this.notifyApprovers(manager, opportunityId, doc.id, doc.name);
      return doc;
    });
  }

  /** RN-014: nova versão reabre a análise. */
  async addVersion(documentId: number, observacoes: string | undefined, file: UploadedFile, user: RequestUser) {
    this.validateFile(file);
    return this.db.transaction(async (manager) => {
      const doc = await this.getDocument(manager, documentId);
      const version = doc.currentVersion + 1;
      const path = this.storage.buildPath(doc.opportunityId, doc.id, version, file.originalname);
      await this.storage.upload(path, file.buffer, file.mimetype);
      await manager.insert(DocumentVersionEntity, {
        documentId,
        version,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: path,
        observacoes: observacoes ?? null,
        uploadedBy: user.id,
      });
      doc.currentVersion = version;
      doc.status = 'em_analise';
      await manager.save(doc);
      if (doc.checklistItemId) {
        await manager.update(ChecklistItemEntity, doc.checklistItemId, { status: 'em_analise' });
      }
      await this.audit.log(manager, [
        {
          entity: 'document', entityId: documentId, opportunityId: doc.opportunityId,
          action: 'upload', field: 'version', oldValue: version - 1, newValue: version, actorId: user.id,
        },
      ]);
      await this.notifyApprovers(manager, doc.opportunityId, doc.id, doc.name);
      return doc;
    });
  }

  listVersions(documentId: number) {
    return this.db.getRepository(DocumentVersionEntity).find({
      where: { documentId },
      relations: { uploader: true },
      order: { version: 'DESC' },
    });
  }

  listReviews(documentId: number) {
    return this.db.getRepository(DocumentReviewEntity).find({
      where: { documentId },
      relations: { reviewer: true },
      order: { reviewedAt: 'DESC' },
    });
  }

  /** UC-08: download por URL assinada, auditado. */
  async downloadUrl(documentId: number, version: number, user: RequestUser) {
    const row = await this.db.getRepository(DocumentVersionEntity).findOneBy({ documentId, version });
    if (!row) throw new NotFoundException('Versão não encontrada');
    const doc = await this.getDocument(this.db.manager, documentId);
    const url = await this.storage.signedUrl(row.storagePath);
    await this.audit.log(this.db.manager, [
      {
        entity: 'document', entityId: documentId, opportunityId: doc.opportunityId,
        action: 'download', field: 'version', newValue: version, actorId: user.id,
      },
    ]);
    return { url, fileName: row.fileName, expiresInSeconds: 300 };
  }

  /** UC-07: aprovação/rejeição com segregação de funções (RN-012/RN-013). */
  async review(documentId: number, action: 'aprovado' | 'rejeitado', justification: string | undefined, user: RequestUser) {
    if (action === 'rejeitado' && !justification) {
      throw new UnprocessableEntityException('Rejeição exige justificativa (RN-012)');
    }
    return this.db.transaction(async (manager) => {
      const doc = await this.getDocument(manager, documentId);
      if (doc.status !== 'em_analise') {
        throw new ConflictException(`Documento não está em análise (status: ${doc.status})`);
      }
      const currentVersion = await manager.findOneBy(DocumentVersionEntity, {
        documentId,
        version: doc.currentVersion,
      });
      if (currentVersion?.uploadedBy === user.id) {
        throw new ForbiddenException('O aprovador não pode ser o autor do upload (RN-013)');
      }

      await manager.insert(DocumentReviewEntity, {
        documentId,
        version: doc.currentVersion,
        action,
        justification: justification ?? null,
        reviewedBy: user.id,
      });
      doc.status = action;
      await manager.save(doc);
      if (doc.checklistItemId) {
        await manager.update(ChecklistItemEntity, doc.checklistItemId, { status: action });
      }
      await this.audit.log(manager, [
        {
          entity: 'document', entityId: documentId, opportunityId: doc.opportunityId,
          action: action === 'aprovado' ? 'approve' : 'reject',
          field: 'version', newValue: doc.currentVersion, actorId: user.id,
        },
      ]);
      if (action === 'rejeitado' && currentVersion) {
        await this.notifications.notify(
          manager,
          [currentVersion.uploadedBy],
          'documento_rejeitado',
          `Documento rejeitado: ${doc.name}`,
          justification ?? '',
          doc.opportunityId,
        );
      }
      return doc;
    });
  }

  /** RN-021: avisa quem pode aprovar (gestores da oportunidade com a permissão). */
  private async notifyApprovers(manager: EntityManager, opportunityId: number, _docId: number, docName: string) {
    const approvers = await manager.query<Array<{ id: string }>>(
      `select distinct u.id
         from opp_opportunities o
         join users u on u.id in (o.gestor_xpto_id, o.gestor_serpro_id)
         join profile_permissions pp on pp.profile_id = u.profile_id
         join permissions pe on pe.id = pp.permission_id and pe.code = 'opp.doc.approve'
        where o.id = $1 and u.active and not u.blocked`,
      [opportunityId],
    );
    await this.notifications.notify(
      manager,
      approvers.map((a) => Number(a.id)),
      'aprovacao_necessaria',
      `Documento aguarda aprovação: ${docName}`,
      '',
      opportunityId,
    );
  }
}
