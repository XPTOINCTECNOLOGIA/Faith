import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { bigint } from './bigint.transformer';

export type NotificationType =
  | 'nova_oportunidade'
  | 'mudanca_etapa'
  | 'documento_pendente'
  | 'documento_rejeitado'
  | 'aprovacao_necessaria'
  | 'contratacao_proxima'
  | 'prazo_vencido';

@Entity({ name: 'opp_notifications' })
export class NotificationEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', transformer: bigint })
  userId: number;

  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'opportunity_id', type: 'bigint', nullable: true, transformer: bigint })
  opportunityId: number | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity({ name: 'opp_audit_log' })
export class AuditLogEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column()
  entity: string;

  @Column({ name: 'entity_id', type: 'bigint', transformer: bigint })
  entityId: number;

  @Column({ name: 'opportunity_id', type: 'bigint', nullable: true, transformer: bigint })
  opportunityId: number | null;

  @Column()
  action: string;

  @Column({ type: 'varchar', nullable: true })
  field: string | null;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string | null;

  @Column({ name: 'actor_id', type: 'bigint', transformer: bigint })
  actorId: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt: Date;
}
