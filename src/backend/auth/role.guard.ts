import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { NotAuthenticated, RoleNotPermitted } from '../common/errors';
import { PrismaService } from '../prisma.service';
import { readSession, SESSION_COOKIE } from './session';

export const PUBLIC = 'teamflow:public';
export const REQUIRES_ADMIN = 'teamflow:requiresAdmin';

export const Public = () => SetMetadata(PUBLIC, true);

// Administrator-only writes: employees, catalogue renames and removals, user accounts (FR-083).
export const AdminOnly = (action: string) => SetMetadata(REQUIRES_ADMIN, action);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, [handler, controller])) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = readSession(request.cookies?.[SESSION_COOKIE]);
    if (!userId) throw new NotAuthenticated();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotAuthenticated();

    request.signedInUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    // Both roles read everything, so visibility never blocks a reallocation decision (FR-080, FR-084).
    const adminAction = this.reflector.getAllAndOverride<string>(REQUIRES_ADMIN, [
      handler,
      controller,
    ]);
    if (adminAction && user.role !== UserRole.ADMINISTRATOR) {
      throw new RoleNotPermitted(adminAction, 'Administrator', user.role);
    }

    return true;
  }
}
