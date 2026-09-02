import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import type { RequestUser } from '../auth/identity.service';
import { CreateDocumentDto, NewVersionDto, RejectDto } from './documents.dto';
import { DocumentsService, UploadedFile as PortalFile } from './documents.service';

@ApiTags('documentos')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('opportunities/:id/documents')
  @RequirePermissions('opp.view')
  list(@Param('id', ParseIntPipe) id: number) {
    return this.service.listByOpportunity(id);
  }

  @Post('opportunities/:id/documents')
  @RequirePermissions('opp.doc.upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cria documento (v1) e o coloca em análise (RN-011)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        category: { type: 'string' },
        docType: { type: 'string' },
        checklistItemId: { type: 'integer' },
        observacoes: { type: 'string' },
      },
      required: ['file', 'name'],
    },
  })
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: PortalFile,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(id, dto, file, user);
  }

  @Post('documents/:id/versions')
  @RequirePermissions('opp.doc.upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Nova versão — reabre a análise (RN-014)' })
  addVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: NewVersionDto,
    @UploadedFile() file: PortalFile,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addVersion(id, dto.observacoes, file, user);
  }

  @Get('documents/:id/versions')
  @RequirePermissions('opp.view')
  versions(@Param('id', ParseIntPipe) id: number) {
    return this.service.listVersions(id);
  }

  @Get('documents/:id/reviews')
  @RequirePermissions('opp.view')
  reviews(@Param('id', ParseIntPipe) id: number) {
    return this.service.listReviews(id);
  }

  @Get('documents/:id/versions/:version/download')
  @RequirePermissions('opp.view')
  @ApiOperation({ summary: 'URL assinada expirável; o download é auditado' })
  download(
    @Param('id', ParseIntPipe) id: number,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.downloadUrl(id, version, user);
  }

  @Post('documents/:id/approve')
  @RequirePermissions('opp.doc.approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.review(id, 'aprovado', undefined, user);
  }

  @Post('documents/:id/reject')
  @RequirePermissions('opp.doc.approve')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectDto, @CurrentUser() user: RequestUser) {
    return this.service.review(id, 'rejeitado', dto.justification, user);
  }
}
