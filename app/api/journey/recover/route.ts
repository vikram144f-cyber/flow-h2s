import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { validateTransition, JourneyState } from '../../../../lib/modules/journey/state-machine';
import mockData from '../../../../static-data/mock-gtfs.json';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fallbackRouteId } = body;

    if (!fallbackRouteId) {
      return NextResponse.json({ error: 'Missing fallbackRouteId' }, { status: 400 });
    }

    const journey = await prisma.journey.findUnique({
      where: { id: 'mock-aarav-journey' }
    });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // 1. Verify the journey is AT_RISK
    const currentState = journey.status as JourneyState;
    if (currentState !== 'AT_RISK') {
      return NextResponse.json({ error: `Cannot recover journey from state: ${currentState}` }, { status: 409 });
    }

    // 2. Generate/validate the selected fallback
    const mockJourney = mockData.journeys.find(j => j.id === journey.id);
    if (!mockJourney || !mockJourney.fallbacks) {
      return NextResponse.json({ error: 'No fallbacks available for this journey' }, { status: 400 });
    }
    const isValidFallback = mockJourney.fallbacks.some(f => f.routeId === fallbackRouteId);
    if (!isValidFallback) {
      return NextResponse.json({ error: 'Invalid fallback selected' }, { status: 400 });
    }

    // 3. Transition AT_RISK -> RECOVERY_OFFERED
    validateTransition('AT_RISK', 'RECOVERY_OFFERED');
    
    // 5. Transition RECOVERY_OFFERED -> RECOVERED
    validateTransition('RECOVERY_OFFERED', 'RECOVERED');

    // 4. Persist the selected fallback/recovery information transactionally
    const updatedJourney = await prisma.$transaction(async (tx) => {
      // We can update both status and recoveredRouteId in one go
      return tx.journey.update({
        where: { id: journey.id },
        data: { 
          status: 'RECOVERED',
          recoveredRouteId: fallbackRouteId
        },
        include: { legs: { orderBy: { order: 'asc' } } }
      });
    });

    // 6. Return the updated journey
    return NextResponse.json({ success: true, message: `Recovered using ${fallbackRouteId}`, journey: updatedJourney });
  } catch (error: any) {
    if (error.message && error.message.includes('transition')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error in /api/journey/recover:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
