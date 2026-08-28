import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth/auth.controller';
import { RoleGuard } from './auth/role.guard';
import { PrismaService } from './prisma.service';

// Providers are limited to the Prisma client and the auth guard. Everything else is a
// controller calling Prisma and src/backend/calc directly (Constitution VII).
@Module({
  controllers: [AuthController],
  providers: [PrismaService, { provide: APP_GUARD, useClass: RoleGuard }],
})
export class AppModule {}
