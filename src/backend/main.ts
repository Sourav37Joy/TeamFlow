import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import next from 'next';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const PORT = Number(process.env.PORT ?? 3000);
const HOSTNAME = process.env.HOSTNAME ?? 'localhost';
const dev = process.env.NODE_ENV !== 'production';

// One deployable: Nest owns /api, and the Next.js handler takes every other path.
// Constitution VII asks for one application and one command, so Next runs inside this
// process rather than as a second server (D-01).
async function bootstrap() {
  const nestApp = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  nestApp.use(cookieParser());
  nestApp.useGlobalFilters(new AllExceptionsFilter());

  // Next is told the hostname and port it is being served on so its dev tooling and
  // asset URLs agree with the port Nest actually binds.
  const web = next({
    dev,
    dir: join(process.cwd(), 'src', 'web'),
    hostname: HOSTNAME,
    port: PORT,
  });
  await web.prepare();
  const webHandler = web.getRequestHandler();

  const expressApp = nestApp.getHttpAdapter().getInstance();
  expressApp.use((req, res, nextFn) => {
    if (req.path.startsWith('/api')) return nextFn();
    return webHandler(req, res);
  });

  await nestApp.listen(PORT, HOSTNAME);
  process.stdout.write(`TeamFlow listening on http://${HOSTNAME}:${PORT}\n`);
}

bootstrap().catch((error) => {
  process.stderr.write(`Failed to start: ${String(error)}\n`);
  process.exit(1);
});
