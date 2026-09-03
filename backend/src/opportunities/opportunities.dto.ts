import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQuery } from '../common/pagination';

export class CreateOpportunityDto {
  @ApiProperty({ enum: ['xpto', 'parceiro', 'serpro'] })
  @IsIn(['xpto', 'parceiro', 'serpro'])
  leadSource: 'xpto' | 'parceiro' | 'serpro';

  @ApiProperty() @Type(() => Number) @IsInt() clientId: number;

  @ApiPropertyOptional({ description: 'Obrigatório quando leadSource = parceiro (RN-005)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  partnerId?: number;

  @ApiProperty() @IsString() @IsNotEmpty() objeto: string;
  @ApiProperty() @IsString() @IsNotEmpty() solucao: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorEstimado?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) receitaPrevista?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probabilidade?: number;

  @ApiPropertyOptional({ enum: ['baixa', 'media', 'alta'] })
  @IsOptional()
  @IsIn(['baixa', 'media', 'alta'])
  complexidade?: 'baixa' | 'media' | 'alta';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) situacaoComercial?: string;

  @ApiProperty() @Type(() => Number) @IsInt() gestorXptoId: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() gestorSerproId?: number;

  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) prazoEstimado?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {}

export class TransitionDto {
  @ApiProperty() @Type(() => Number) @IsInt() toStageId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() justification?: string;
}

export class CloseDto {
  @ApiProperty({ enum: ['ganha', 'perdida', 'cancelada'] })
  @IsIn(['ganha', 'perdida', 'cancelada'])
  outcome: 'ganha' | 'perdida' | 'cancelada';

  @ApiProperty() @IsString() @IsNotEmpty() justification: string;
}

export class JustificationDto {
  @ApiProperty() @IsString() @IsNotEmpty() justification: string;
}

export class CommentDto {
  @ApiProperty() @IsString() @IsNotEmpty() body: string;
}

export class OpportunityListQuery extends PageQuery {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() stageId?: number;
  @ApiPropertyOptional({ enum: ['aberta', 'ganha', 'perdida', 'cancelada'] })
  @IsOptional()
  @IsIn(['aberta', 'ganha', 'perdida', 'cancelada'])
  status?: string;

  @ApiPropertyOptional({ enum: ['xpto', 'parceiro', 'serpro'] })
  @IsOptional()
  @IsIn(['xpto', 'parceiro', 'serpro'])
  leadSource?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() gestorId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() partnerId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() clientId?: number;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{2}$/) uf?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() minValue?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() maxValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class WaiveDto extends PickType(JustificationDto, ['justification']) {}
