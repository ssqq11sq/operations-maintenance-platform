import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { AppModule } from './app.module';
import { formatApiMessage } from './common/utils/api-error-message';

async function bootstrap() {
  const dbFile = process.env.DB_DATABASE || './data/omp.sqlite';
  mkdirSync(dirname(join(process.cwd(), dbFile)), { recursive: true });
  mkdirSync(join(process.cwd(), process.env.LOCAL_UPLOAD_DIR || './uploads'), {
    recursive: true,
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          e.constraints ? Object.values(e.constraints) : [],
        );
        return new BadRequestException(
          formatApiMessage(messages, '请求参数不正确'),
        );
      },
    }),
  );

  const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads/' });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API running at http://localhost:${port}/api`);
}

bootstrap();
