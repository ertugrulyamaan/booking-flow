import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // A database check is added together with Prisma in week 1.
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
