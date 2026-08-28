import { prisma } from '../../db';
import { Prisma } from '@prisma/client';
import mockData from '../../../static-data/mock-gtfs.json';

export async function resetDatabaseToDeterministicSeed() {
  console.log('Resetting database for deterministic demo...');

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Clear existing data in foreign-key order and seed the replacement atomically.
    await tx.transfer.deleteMany({});
    await tx.leg.deleteMany({});
    await tx.journey.deleteMany({});

    console.log('Seeding normal starting state...');

    for (const mockJourney of mockData.journeys) {
      await tx.journey.create({
        data: {
          id: mockJourney.id,
          status: 'ACTIVE',
          origin: mockJourney.origin,
          destination: mockJourney.destination,
          currentConfidence: 100,
          explainabilityPayload: null,
          startTime: new Date(mockJourney.legs[0].scheduledDeparture),
          legs: {
            create: mockJourney.legs.map((leg, index) => ({
              id: leg.id,
              type: leg.type,
              routeId: leg.routeId,
              originNode: leg.originNode,
              destinationNode: leg.destinationNode,
              scheduledDeparture: new Date(leg.scheduledDeparture),
              scheduledArrival: new Date(leg.scheduledArrival),
              predictedDeparture: new Date(leg.scheduledDeparture),
              predictedArrival: new Date(leg.scheduledArrival),
              historicalP95DelayMinutes: leg.historicalP95DelayMinutes || 5,
              order: index
            }))
          }
        }
      });

      if (mockJourney.transfers) {
        for (const mockTransfer of mockJourney.transfers) {
          await tx.transfer.create({
            data: {
              fromLegId: mockTransfer.fromLegId,
              toLegId: mockTransfer.toLegId,
              requiredTransferTime: mockTransfer.requiredTransferTime
            }
          });
        }
      }
    }
  });

  console.log('Deterministic seed complete. System is ready for Aarav demo.');
  return { success: true, message: 'Database reset deterministically' };
}
