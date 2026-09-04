import { resetDatabaseToDeterministicSeed } from '../lib/modules/journey/seed-service';
import { prisma } from '../lib/db';

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
