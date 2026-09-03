import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChecklistItemEntity,
  CommentEntity,
  OpportunityEntity,
  StageTransitionEntity,
} from '../entities/opportunity.entities';
import { StagesModule } from '../stages/stages.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OpportunityEntity, ChecklistItemEntity, StageTransitionEntity, CommentEntity]),
    StagesModule,
  ],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
