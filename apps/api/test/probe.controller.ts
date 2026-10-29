import { Body, Controller, Get, Post } from '@nestjs/common';
import { createBookingRequestSchema, type CreateBookingRequest } from '@booking-flow/shared';
import { ZodValidationPipe } from '../src/common/zod-validation.pipe';
import { PrismaService } from '../src/prisma/prisma.service';

export const LEAKY_ERROR_MESSAGE = 'connection to 10.0.0.7 failed for user "booking"';

/** Test-only routes that exercise the validation pipe and the exception filter. */
@Controller('test-probe')
export class ProbeController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('validate')
  validate(
    @Body(new ZodValidationPipe(createBookingRequestSchema)) body: CreateBookingRequest,
  ): CreateBookingRequest {
    return body;
  }

  @Get('crash')
  crash(): never {
    throw new Error(LEAKY_ERROR_MESSAGE);
  }

  /** Inserts a copy of an active seeded booking, which the exclusion constraint must reject. */
  @Post('overlap')
  async overlap(): Promise<void> {
    const existing = await this.prisma.booking.findFirstOrThrow({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    });
    await this.prisma.booking.create({
      data: {
        roomId: existing.roomId,
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
        guests: 1,
        guestName: 'Overlap Probe',
        guestEmail: 'overlap@example.com',
        status: 'APPROVED',
      },
    });
  }

  /** Same as `overlap`, through a raw query, which reports the SQLSTATE differently. */
  @Post('overlap-raw')
  async overlapRaw(): Promise<void> {
    const existing = await this.prisma.booking.findFirstOrThrow({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    });
    await this.prisma.$executeRaw`
      INSERT INTO bookings (room_id, check_in, check_out, guests, guest_name, guest_email, status)
      VALUES (${existing.roomId}::uuid, ${existing.checkIn}::date, ${existing.checkOut}::date,
              1, 'Overlap Probe', 'overlap@example.com', 'APPROVED')`;
  }
}
