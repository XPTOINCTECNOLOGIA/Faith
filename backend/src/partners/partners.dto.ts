import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(18) cnpj?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) contactPhone?: string;
}

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
