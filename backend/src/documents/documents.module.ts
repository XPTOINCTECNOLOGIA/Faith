import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  DocumentReviewEntity,
  DocumentVersionEntity,
} from '../entities/document.entities';
import { ChecklistItemEntity } from '../entities/opportunity.entities';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, DocumentVersionEntity, DocumentReviewEntity, ChecklistItemEntity]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService],
})
export class DocumentsModule {}
