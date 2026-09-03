import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigint, numericMoney } from './bigint.transformer';
import { ClientEntity, PartnerEntity } from './client.entities';
import { UserEntity } from './shared.entities';
import { StageEntity } from './stage.entities';

export type LeadSource = 'xpto' | 'parceiro' | 'serpro';
export type OpportunityStatus = 'aberta' | 'ganha' | 'perdida' | 'cancelada';
export type Complexidade = 'baixa' | 'media' | 'alta';

@Entity({ name: 'opp_opportunities' })
export class OpportunityEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column()
  code: string;

  @Column({ name: 'lead_source', type: 'varchar' })
  leadSource: LeadSource;

  @Column({ name: 'client_id', type: 'bigint', transformer: bigint })
  clientId: number;

  @ManyToOne(() => ClientEntity)
  @JoinColumn({ name: 'client_id' })
  client?: ClientEntity;

  @Column({ name: 'partner_id', type: 'bigint', nullable: true, transformer: bigint })
  partnerId: number | null;

  @ManyToOne(() => PartnerEntity)
  @JoinColumn({ name: 'partner_id' })
  partner?: PartnerEntity | null;

  @Column({ type: 'text' })
  objeto: string;

  @Column({ type: 'text' })
  solucao: string;

  @Column({ name: 'valor_estimado', type: 'numeric', nullable: true, transformer: numericMoney })
  valorEstimado: number | null;

  @Column({ name: 'receita_prevista', type: 'numeric', nullable: true, transformer: numericMoney })
  receitaPrevista: number | null;

  @Column({ type: 'int', nullable: true })
  probabilidade: number | null;

  @Column({ type: 'varchar', nullable: true })
  complexidade: Complexidade | null;

  @Column({ name: 'situacao_comercial', type: 'varchar', nullable: true })
  situacaoComercial: string | null;

  @Column({ name: 'stage_id', type: 'bigint', transformer: bigint })
  stageId: number;

  @ManyToOne(() => StageEntity)
  @JoinColumn({ name: 'stage_id' })
  stage?: StageEntity;

  @Column({ type: 'varchar' })
  status: OpportunityStatus;

  @Column({ name: 'closure_reason', type: 'text', nullable: true })
  closureReason: string | null;

  @Column({ name: 'gestor_xpto_id', type: 'bigint', transformer: bigint })
  gestorXptoId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'gestor_xpto_id' })
  gestorXpto?: UserEntity;

  @Column({ name: 'gestor_serpro_id', type: 'bigint', nullable: true, transformer: bigint })
  gestorSerproId: number | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'gestor_serpro_id' })
  gestorSerpro?: UserEntity | null;

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate: string | null;

  @Column({ name: 'prazo_estimado', type: 'varchar', nullable: true })
  prazoEstimado: string | null;

  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  @Column({ name: 'created_by', type: 'bigint', transformer: bigint })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export type ChecklistItemStatus = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'dispensado';

@Entity({ name: 'opp_checklist_items' })
export class ChecklistItemEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'opportunity_id', type: 'bigint', transformer: bigint })
  opportunityId: number;

  @Column({ name: 'template_id', type: 'bigint', transformer: bigint })
  templateId: number;

  @Column({ name: 'stage_id', type: 'bigint', transformer: bigint })
  stageId: number;

  @Column()
  name: string;

  @Column()
  required: boolean;

  @Column({ name: 'document_id', type: 'bigint', nullable: true, transformer: bigint })
  documentId: number | null;

  @Column({ type: 'varchar' })
  status: ChecklistItemStatus;

  @Column({ name: 'waived_by', type: 'bigint', nullable: true, transformer: bigint })
  waivedBy: number | null;

  @Column({ name: 'waived_reason', type: 'text', nullable: true })
  waivedReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity({ name: 'opp_stage_transitions' })
export class StageTransitionEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'opportunity_id', type: 'bigint', transformer: bigint })
  opportunityId: number;

  @Column({ name: 'from_stage_id', type: 'bigint', nullable: true, transformer: bigint })
  fromStageId: number | null;

  @Column({ name: 'to_stage_id', type: 'bigint', transformer: bigint })
  toStageId: number;

  @Column({ name: 'moved_by', type: 'bigint', transformer: bigint })
  movedBy: number;

  @CreateDateColumn({ name: 'moved_at' })
  movedAt: Date;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb livre; o DeepPartial do TypeORM não modela Record com null
  @Column({ type: 'jsonb', nullable: true })
  snapshot: any;
}

@Entity({ name: 'opp_comments' })
export class CommentEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'opportunity_id', type: 'bigint', transformer: bigint })
  opportunityId: number;

  @Column({ name: 'author_id', type: 'bigint', transformer: bigint })
  authorId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'author_id' })
  author?: UserEntity;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
