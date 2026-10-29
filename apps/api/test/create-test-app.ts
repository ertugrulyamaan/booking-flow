import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { ProbeController } from './probe.controller';

export async function createTestApp(
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<INestApplication> {
  const moduleRef = await override(
    Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] }),
  ).compile();

  // Expected failures (DB down, crashes) would otherwise flood the test output.
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}
