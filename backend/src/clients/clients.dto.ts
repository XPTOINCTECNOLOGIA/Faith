import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) orgao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(18) cnpj?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) municipio?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{2}$/) uf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
