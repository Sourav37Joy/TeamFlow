import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AssignmentsController } from './assignments/assignments.controller';
import { AuthController } from './auth/auth.controller';
import { RoleGuard } from './auth/role.guard';
import { CatalogueController } from './catalogue/catalogue.controller';
import { EmployeeSkillsController } from './employees/employee-skills.controller';
import { EmployeesController } from './employees/employees.controller';
import { PrismaService } from './prisma.service';
import { ProjectsController } from './projects/projects.controller';
import { RequirementsController } from './projects/requirements.controller';

// Providers are limited to the Prisma client and the auth guard. Everything else is a
// controller calling Prisma and src/backend/calc directly (Constitution VII).
@Module({
  controllers: [
    AuthController,
    CatalogueController,
    EmployeesController,
    EmployeeSkillsController,
    ProjectsController,
    RequirementsController,
    AssignmentsController,
  ],
  providers: [PrismaService, { provide: APP_GUARD, useClass: RoleGuard }],
})
export class AppModule {}
