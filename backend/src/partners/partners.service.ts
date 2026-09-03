import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { isValidCnpj, normalizeCnpj } from '../common/cnpj';
import { Page, PageQuery, toPage } from '../common/pagination';
import { PartnerEntity } from '../entities/client.entities';
import { CreatePartnerDto, UpdatePartnerDto } from './partners.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(PartnerEntity) private readonly repo: Repository<PartnerEntity>,
    private readonly audit: AuditService,
  ) {}

  async list(q: PageQuery & { search?: string }): Promise<Page<PartnerEntity>> {
    const [items, total] = await this.repo.findAndCount({
      where: q.search ? { name: ILike(`%${q.search}%`), active: true } : { active: true },
      order: { name: 'ASC' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    });
    return toPage(items, total, q);
  }

  async get(id: number): Promise<PartnerEntity> {
    const partner = await this.repo.findOneBy({ id });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    return partner;
  }

  private validateCnpj(dto: { cnpj?: string }) {
    if (dto.cnpj) {
      if (!isValidCnpj(dto.cnpj)) throw new UnprocessableEntityException('CNPJ inválido (RN-006)');
      dto.cnpj = normalizeCnpj(dto.cnpj);
    }
  }

  async create(dto: CreatePartnerDto, actorId: number): Promise<PartnerEntity> {
    this.validateCnpj(dto);
    const partner = await this.repo.save(this.repo.create({ ...dto, active: true, createdBy: actorId }));
    await this.audit.log(this.repo.manager, [
      { entity: 'partner', entityId: partner.id, action: 'create', actorId },
    ]);
    return partner;
  }

  async update(id: number, dto: UpdatePartnerDto, actorId: number): Promise<PartnerEntity> {
    this.validateCnpj(dto);
    const partner = await this.get(id);
    const entries = this.audit.diff(
      { entity: 'partner', entityId: id, action: 'update', actorId },
      partner,
      dto,
      ['name', 'cnpj', 'contactName', 'contactEmail', 'contactPhone', 'active'],
    );
    Object.assign(partner, dto);
    const saved = await this.repo.save(partner);
    await this.audit.log(this.repo.manager, entries);
    return saved;
  }
}
