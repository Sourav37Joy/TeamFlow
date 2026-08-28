import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { NotAuthenticated } from '../common/errors';

export interface SignedInUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

// Attribution comes from the session, never from a value the caller supplied (FR-081, FR-087).
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.signedInUser as SignedInUser | undefined;
  if (!user) throw new NotAuthenticated();
  return user;
});
