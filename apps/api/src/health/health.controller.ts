import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import { ApiException } from '../common/api.exception';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.warn(`Database check failed: ${error instanceof Error ? error.message : error}`);
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'Database is unreachable',
      );
    }
    return { status: 'ok', database: 'up' };
  }
}
