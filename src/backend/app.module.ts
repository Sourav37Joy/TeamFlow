import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AssignmentsController } from './assignments/assignments.controller';
import { ReplacementCandidatesController } from './assignments/candidates.controller';
import { AuthController } from './auth/auth.controller';
import { RoleGuard } from './auth/role.guard';
import { CatalogueController } from './catalogue/catalogue.controller';
import { EmployeeSkillsController } from './employees/employee-skills.controller';
import { EmployeesController } from './employees/employees.controller';
import { UtilizationController } from './employees/utilization.controller';
import { PrismaService } from './prisma.service';
import { CandidatesController } from './projects/candidates.controller';
import { ProjectsController } from './projects/projects.controller';
import { RequirementsController } from './projects/requirements.controller';
import { StaffingController } from './projects/staffing.controller';
import { AllocationController } from './views/allocation.controller';
import { DashboardController } from './views/dashboard.controller';

// Providers are limited to the Prisma client and the auth guard. Everything else is a
// controller calling Prisma and src/backend/calc directly (Constitution VII).
@Module({
  controllers: [
    AuthController,
    CatalogueController,
    EmployeesController,
    EmployeeSkillsController,
    UtilizationController,
    ProjectsController,
    RequirementsController,
    StaffingController,
    CandidatesController,
    AssignmentsController,
    ReplacementCandidatesController,
    AllocationController,
    DashboardController,
  ],
  providers: [PrismaService, { provide: APP_GUARD, useClass: RoleGuard }],
})
export class AppModule {}
