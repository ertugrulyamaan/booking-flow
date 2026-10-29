import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(databaseUrl: string) {
    super({ datasourceUrl: databaseUrl });
  }

  /**
   * Connects eagerly so the first request does not pay for it. A database that is down at boot does
   * not stop the API: Prisma connects again on the next query, and /api/health reports 503 meanwhile.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Could not connect to the database: ${reason}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
