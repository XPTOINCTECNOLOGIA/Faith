import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) docType?: string;
  @ApiPropertyOptional({ description: 'Vincula o documento a um item do checklist' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  checklistItemId?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class NewVersionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class RejectDto {
  @ApiProperty() @IsString() @IsNotEmpty() justification: string;
}
