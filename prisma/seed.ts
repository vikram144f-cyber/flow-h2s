import { PrismaClient } from '@prisma/client';
import { resetDatabaseToDeterministicSeed } from '../lib/modules/journey/seed-service';

const prisma = new PrismaClient();

async function main() {
  await resetDatabaseToDeterministicSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
