import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { bigint } from './bigint.transformer';

@Entity({ name: 'opp_clients' })
export class ClientEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  orgao: string | null;

  @Column({ type: 'varchar', nullable: true })
  cnpj: string | null;

  @Column({ type: 'varchar', nullable: true })
  municipio: string | null;

  @Column({ type: 'char', length: 2, nullable: true })
  uf: string | null;

  @Column({ name: 'contact_name', type: 'varchar', nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
  contactPhone: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column()
  active: boolean;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, transformer: bigint })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity({ name: 'opp_partners' })
export class PartnerEntity {
  @PrimaryColumn({ type: 'bigint', generated: 'increment', transformer: bigint })
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  cnpj: string | null;

  @Column({ name: 'contact_name', type: 'varchar', nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
  contactPhone: string | null;

  @Column()
  active: boolean;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, transformer: bigint })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
