/**
 * Resets the database and fills it with deterministic demo data.
 * The same parameters always produce the same rows, so measurements can be repeated.
 *
 *   SEED_ROOMS=5 SEED_BOOKINGS=100 SEED_RANDOM_SEED=42 SEED_START_DATE=2026-11-01 pnpm prisma:seed
 */
import { BookingStatus, Prisma, PrismaClient } from '@prisma/client';

const ROOM_NAMES = [
  'Garden Room',
  'Sea View Double',
  'Attic Suite',
  'Courtyard Twin',
  'Family Loft',
];
const HOLD_HOURS = 24;
const CHUNK_SIZE = 1000;

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
  }
  return value;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** mulberry32: a tiny seeded PRNG, good enough for demo data. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function pickStatus(roll: number): BookingStatus {
  if (roll < 0.6) return BookingStatus.APPROVED;
  if (roll < 0.75) return BookingStatus.REJECTED;
  if (roll < 0.85) return BookingStatus.CANCELLED;
  if (roll < 0.95) return BookingStatus.EXPIRED;
  return BookingStatus.PENDING;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_RESET !== 'true') {
    throw new Error(
      'Refusing to reset a production database. Set SEED_ALLOW_RESET=true to override.',
    );
  }

  const params = {
    rooms: intFromEnv('SEED_ROOMS', 5),
    bookings: intFromEnv('SEED_BOOKINGS', 100),
    randomSeed: intFromEnv('SEED_RANDOM_SEED', 42),
    startDate: process.env.SEED_START_DATE || todayUtc(),
  };
  const start = new Date(`${params.startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`SEED_START_DATE must be YYYY-MM-DD, got "${params.startDate}"`);
  }

  const random = createRandom(params.randomSeed);
  const prisma = new PrismaClient();

  try {
    await prisma.$executeRaw`TRUNCATE bookings, room_blocks, rooms CASCADE`;

    const rooms: Prisma.RoomCreateManyInput[] = Array.from({ length: params.rooms }, (_, i) => ({
      slug: `room-${String(i + 1).padStart(3, '0')}`,
      name: ROOM_NAMES[i] ?? `Room ${i + 1}`,
      description: 'A quiet room with breakfast included.',
      capacity: 1 + Math.floor(random() * 4),
      basePrice: (60 + Math.floor(random() * 120)).toFixed(2),
    }));
    await prisma.room.createMany({ data: rooms });
    const roomIds = (
      await prisma.room.findMany({ select: { id: true }, orderBy: { slug: 'asc' } })
    ).map((room) => room.id);

    // Bookings are laid out back to back per room, so the active ones never overlap.
    const holdUntil = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);
    const heldUntilInThePast = new Date(Date.now() - 60 * 60 * 1000);
    const nextFreeDay = roomIds.map(() => start);
    const bookings: Prisma.BookingCreateManyInput[] = [];
    for (let i = 0; i < params.bookings && roomIds.length > 0; i++) {
      const roomIndex = i % roomIds.length;
      const checkIn = addDays(nextFreeDay[roomIndex]!, Math.floor(random() * 4));
      const checkOut = addDays(checkIn, 1 + Math.floor(random() * 7));
      nextFreeDay[roomIndex] = checkOut;

      const status = pickStatus(random());
      bookings.push({
        roomId: roomIds[roomIndex]!,
        checkIn,
        checkOut,
        guests: 1,
        guestName: `Guest ${i + 1}`,
        guestEmail: `guest${i + 1}@example.com`,
        status,
        expiresAt:
          status === BookingStatus.PENDING
            ? holdUntil
            : status === BookingStatus.EXPIRED
              ? heldUntilInThePast
              : null,
      });
    }
    for (let i = 0; i < bookings.length; i += CHUNK_SIZE) {
      await prisma.booking.createMany({ data: bookings.slice(i, i + CHUNK_SIZE) });
    }

    const byStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: true,
      orderBy: { status: 'asc' },
    });
    console.log('Seed parameters:', params);
    console.log(`Rooms: ${roomIds.length}, bookings: ${bookings.length}`);
    console.table(byStatus.map((row) => ({ status: row.status, count: row._count })));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
