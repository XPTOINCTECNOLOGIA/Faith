import { Column, Entity, PrimaryColumn } from 'typeorm';
import { bigint } from './bigint.transformer';

@Entity({ name: 'opp_stages' })
export class StageEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  position: number;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ name: 'is_terminal' })
  isTerminal: boolean;

  @Column()
  active: boolean;
}

@Entity({ name: 'opp_checklist_templates' })
export class ChecklistTemplateEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column({ name: 'stage_id', type: 'bigint', transformer: bigint })
  stageId: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'doc_category', type: 'varchar', nullable: true })
  docCategory: string | null;

  @Column()
  required: boolean;

  @Column()
  position: number;

  @Column()
  active: boolean;
}
