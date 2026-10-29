import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Variables come from the process environment; the npm scripts load the root .env for local runs.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
