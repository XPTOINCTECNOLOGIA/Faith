import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ChecklistTemplateEntity, StageEntity } from '../entities/stage.entities';
import {
  CreateChecklistTemplateDto,
  CreateStageDto,
  UpdateChecklistTemplateDto,
  UpdateStageDto,
} from './stages.dto';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(StageEntity) private readonly stages: Repository<StageEntity>,
    @InjectRepository(ChecklistTemplateEntity)
    private readonly templates: Repository<ChecklistTemplateEntity>,
    private readonly audit: AuditService,
  ) {}

  list(all = false) {
    return this.stages.find({
      where: all ? {} : { active: true },
      order: { position: 'ASC' },
    });
  }

  async get(id: number): Promise<StageEntity> {
    const stage = await this.stages.findOneBy({ id });
    if (!stage) throw new NotFoundException('Etapa não encontrada');
    return stage;
  }

  /** Próxima etapa ativa da esteira (RN-002). */
  async nextOf(stage: StageEntity): Promise<StageEntity | null> {
    return this.stages
      .createQueryBuilder('s')
      .where('s.active and s.position > :pos', { pos: stage.position })
      .orderBy('s.position', 'ASC')
      .getOne();
  }

  terminal(): Promise<StageEntity | null> {
    return this.stages.findOneBy({ isTerminal: true, active: true });
  }

  first(): Promise<StageEntity | null> {
    return this.stages.findOne({ where: { active: true, isTerminal: false }, order: { position: 'ASC' } });
  }

  async create(dto: CreateStageDto, actorId: number): Promise<StageEntity> {
    const stage = await this.stages.save(this.stages.create({ ...dto, isTerminal: false, active: true }));
    await this.audit.log(this.stages.manager, [
      { entity: 'stage', entityId: stage.id, action: 'create', actorId },
    ]);
    return stage;
  }

  async update(id: number, dto: UpdateStageDto, actorId: number): Promise<StageEntity> {
    const stage = await this.get(id);
    if (dto.active === false) {
      const inUse = await this.stages.manager.query(
        'select 1 from opp_opportunities where stage_id = $1 limit 1',
        [id],
      );
      if (inUse.length && stage.isTerminal) {
        throw new ConflictException('A etapa terminal não pode ser desativada.');
      }
    }
    const entries = this.audit.diff(
      { entity: 'stage', entityId: id, action: 'update', actorId },
      stage,
      dto,
      ['code', 'name', 'position', 'color', 'active'],
    );
    Object.assign(stage, dto);
    const saved = await this.stages.save(stage);
    await this.audit.log(this.stages.manager, entries);
    return saved;
  }

  listTemplates(stageId: number) {
    return this.templates.find({ where: { stageId }, order: { position: 'ASC' } });
  }

  async createTemplate(stageId: number, dto: CreateChecklistTemplateDto, actorId: number) {
    await this.get(stageId);
    const template = await this.templates.save(
      this.templates.create({ ...dto, stageId, required: dto.required ?? true, position: dto.position ?? 0, active: true }),
    );
    await this.audit.log(this.templates.manager, [
      { entity: 'checklist_template', entityId: template.id, action: 'create', actorId },
    ]);
    return template;
  }

  async updateTemplate(id: number, dto: UpdateChecklistTemplateDto, actorId: number) {
    const template = await this.templates.findOneBy({ id });
    if (!template) throw new NotFoundException('Template não encontrado');
    const entries = this.audit.diff(
      { entity: 'checklist_template', entityId: id, action: 'update', actorId },
      template,
      dto,
      ['name', 'description', 'docCategory', 'required', 'position', 'active'],
    );
    Object.assign(template, dto);
    const saved = await this.templates.save(template);
    await this.audit.log(this.templates.manager, entries);
    return saved;
  }
}
