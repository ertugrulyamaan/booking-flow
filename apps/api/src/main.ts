import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  // An invalid environment fails here: Nest logs the EnvValidationError and exits with code 1.
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('API_PORT', { infer: true }));
}

void bootstrap();
