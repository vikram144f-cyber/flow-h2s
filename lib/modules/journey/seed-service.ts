import { prisma } from '../../db';
import mockData from '../../../static-data/mock-gtfs.json';

export async function resetDatabaseToDeterministicSeed() {
  console.log('Resetting database for deterministic demo...');
  
  // Clear existing data (in correct order due to foreign keys)
  await prisma.transfer.deleteMany({});
  await prisma.leg.deleteMany({});
  await prisma.journey.deleteMany({});
  
  console.log('Seeding normal starting state...');
  
  for (const mockJourney of mockData.journeys) {
    // Create the journey
    const journey = await prisma.journey.create({
      data: {
        id: mockJourney.id,
        status: 'ACTIVE',
        origin: mockJourney.origin,
        destination: mockJourney.destination,
        currentConfidence: 100,
        explainabilityPayload: null,
        startTime: new Date(mockJourney.legs[0].scheduledDeparture),
        // Create legs
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

    // Create transfers
    if (mockJourney.transfers) {
      for (const mockTransfer of mockJourney.transfers) {
        await prisma.transfer.create({
          data: {
            fromLegId: mockTransfer.fromLegId,
            toLegId: mockTransfer.toLegId,
            requiredTransferTime: mockTransfer.requiredTransferTime
          }
        });
      }
    }
  }

  console.log('Deterministic seed complete. System is ready for Aarav demo.');
  return { success: true, message: 'Database reset deterministically' };
}
