import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigint } from './bigint.transformer';
import { UserEntity } from './shared.entities';

export type DocumentStatus = 'em_analise' | 'aprovado' | 'rejeitado';

@Entity({ name: 'opp_documents' })
export class DocumentEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'opportunity_id', type: 'bigint', transformer: bigint })
  opportunityId: number;

  @Column({ name: 'checklist_item_id', type: 'bigint', nullable: true, transformer: bigint })
  checklistItemId: number | null;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ name: 'doc_type', type: 'varchar', nullable: true })
  docType: string | null;

  @Column({ type: 'varchar' })
  status: DocumentStatus;

  @Column({ name: 'current_version' })
  currentVersion: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'bigint', transformer: bigint })
  createdBy: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity({ name: 'opp_document_versions' })
export class DocumentVersionEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'document_id', type: 'bigint', transformer: bigint })
  documentId: number;

  @Column()
  version: number;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true, transformer: bigint })
  sizeBytes: number | null;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath: string;

  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  @Column({ name: 'uploaded_by', type: 'bigint', transformer: bigint })
  uploadedBy: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: UserEntity;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}

@Entity({ name: 'opp_document_reviews' })
export class DocumentReviewEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'document_id', type: 'bigint', transformer: bigint })
  documentId: number;

  @Column()
  version: number;

  @Column({ type: 'varchar' })
  action: 'aprovado' | 'rejeitado';

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ name: 'reviewed_by', type: 'bigint', transformer: bigint })
  reviewedBy: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: UserEntity;

  @CreateDateColumn({ name: 'reviewed_at' })
  reviewedAt: Date;
}
