import { Body, Controller, Delete, Get, Post, Res, UsePipes } from '@nestjs/common';
import type { Response } from 'express';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { ValidationFailed } from '../common/errors';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';
import { CurrentUser, SignedInUser } from './current-user.decorator';
import { Public } from './role.guard';
import { SESSION_COOKIE, signSession } from './session';

const signInSchema = z.object({
  email: z.string().email('a valid email address'),
  password: z.string().min(1, 'a non-empty password'),
});

@Controller('api/session')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post()
  @UsePipes(new ZodValidationPipe(signInSchema))
  async signIn(
    @Body() body: z.infer<typeof signInSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    const ok = user ? await argon2.verify(user.passwordHash, body.password) : false;
    if (!user || !ok) {
      throw new ValidationFailed([
        {
          field: 'email',
          permitted: 'an email and password pair that match a registered account',
          code: 'CREDENTIALS_REJECTED',
        },
      ]);
    }

    res.cookie(SESSION_COOKIE, signSession(user.id), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 1000 * 60 * 60 * 12,
    });

    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
  }

  @Get()
  session(@CurrentUser() user: SignedInUser) {
    return user;
  }

  @Delete()
  signOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { signedOut: true };
  }
}
