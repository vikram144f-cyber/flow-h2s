import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import mockData from '../../../static-data/mock-gtfs.json';

export async function GET() {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: 'mock-aarav-journey' },
      include: {
        legs: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Parse the explainability payload if it exists
    const payload = journey.explainabilityPayload ? JSON.parse(journey.explainabilityPayload) : null;

    let selectedRoute: any = null;
    if (journey.status === 'RECOVERED' && journey.recoveredRouteId) {
      const mockJourney = mockData.journeys.find(j => j.id === journey.id);
      if (mockJourney && mockJourney.fallbacks) {
        const fallback = mockJourney.fallbacks.find(f => f.routeId === journey.recoveredRouteId);
        if (fallback) {
          // Calculate departure and arrival time
          // Baseline original departure: 08:35 AM. Arrival: 09:01 AM (26 mins)
          // For simplicity in this deterministic MVP, let's derive it similarly to comparison.ts
          // Or just use fixed strings based on timeDelta since it's an MVP demo
          const formatTime = (d: Date) => {
            const h = d.getUTCHours();
            const m = String(d.getUTCMinutes()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            return `${String(h % 12 || 12).padStart(2, '0')}:${m} ${ampm}`;
          };
          
          const departureDate = new Date(mockJourney.legs[1].scheduledDeparture);
          // Assuming fallback departure is the same or dynamically adjusted? 
          // Let's just say departure is 12 mins later (delay)
          departureDate.setUTCMinutes(departureDate.getUTCMinutes() + 12);
          
          const arrivalDate = new Date(mockJourney.legs[1].scheduledArrival);
          arrivalDate.setUTCMinutes(arrivalDate.getUTCMinutes() + fallback.timeDelta);
          
          selectedRoute = {
            ...fallback,
            departureTime: formatTime(departureDate),
            arrivalTime: formatTime(arrivalDate)
          };
        }
      }
    }

    return NextResponse.json({
      ...journey,
      explainabilityPayload: payload,
      selectedRoute
    });
  } catch (error: any) {
    console.error('Error in /api/journey:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
