import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new PrismaService(config.get('DATABASE_URL', { infer: true })),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
