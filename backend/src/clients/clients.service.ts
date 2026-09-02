import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { isValidCnpj, normalizeCnpj } from '../common/cnpj';
import { Page, PageQuery, toPage } from '../common/pagination';
import { ClientEntity } from '../entities/client.entities';
import { CreateClientDto, UpdateClientDto } from './clients.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity) private readonly repo: Repository<ClientEntity>,
    private readonly audit: AuditService,
  ) {}

  async list(q: PageQuery & { search?: string }): Promise<Page<ClientEntity>> {
    const where = q.search
      ? [
          { name: ILike(`%${q.search}%`), active: true },
          { orgao: ILike(`%${q.search}%`), active: true },
        ]
      : { active: true };
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    });
    return toPage(items, total, q);
  }

  async get(id: number): Promise<ClientEntity> {
    const client = await this.repo.findOneBy({ id });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  private validateCnpj(dto: { cnpj?: string }) {
    if (dto.cnpj) {
      if (!isValidCnpj(dto.cnpj)) throw new UnprocessableEntityException('CNPJ inválido (RN-006)');
      dto.cnpj = normalizeCnpj(dto.cnpj);
    }
  }

  async create(dto: CreateClientDto, actorId: number): Promise<ClientEntity> {
    this.validateCnpj(dto);
    const client = await this.repo.save(this.repo.create({ ...dto, active: true, createdBy: actorId }));
    await this.audit.log(this.repo.manager, [
      { entity: 'client', entityId: client.id, action: 'create', actorId },
    ]);
    return client;
  }

  async update(id: number, dto: UpdateClientDto, actorId: number): Promise<ClientEntity> {
    this.validateCnpj(dto);
    const client = await this.get(id);
    const entries = this.audit.diff(
      { entity: 'client', entityId: id, action: 'update', actorId },
      client,
      dto,
      ['name', 'orgao', 'cnpj', 'municipio', 'uf', 'contactName', 'contactEmail', 'contactPhone', 'notes', 'active'],
    );
    Object.assign(client, dto);
    const saved = await this.repo.save(client);
    await this.audit.log(this.repo.manager, entries);
    return saved;
  }

  async deactivate(id: number, actorId: number): Promise<void> {
    await this.update(id, { active: false }, actorId);
  }
}
