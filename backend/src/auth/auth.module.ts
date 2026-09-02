import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PermissionEntity,
  ProfileEntity,
  ProfilePermissionEntity,
  UserEntity,
} from '../entities/shared.entities';
import { AuthController } from './auth.controller';
import { IdentityService } from './identity.service';
import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([UserEntity, ProfileEntity, PermissionEntity, ProfilePermissionEntity]),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, IdentityService],
  exports: [IdentityService],
})
export class AuthModule {}
