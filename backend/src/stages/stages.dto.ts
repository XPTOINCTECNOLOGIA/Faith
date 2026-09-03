import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateStageDto {
  @ApiProperty() @IsString() @MaxLength(50) code: string;
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiProperty() @IsInt() @Min(1) position: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) color?: string;
}

export class UpdateStageDto extends PartialType(CreateStageDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateChecklistTemplateDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) docCategory?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() required?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() position?: number;
}

export class UpdateChecklistTemplateDto extends PartialType(CreateChecklistTemplateDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
