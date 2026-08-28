import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { validateTransition } from '../../../../lib/modules/journey/state-machine';
import mockData from '../../../../static-data/mock-gtfs.json';
import { errorMessage, hasErrorMessage } from '../../../../lib/http';

export async function POST() {
  try {
    const journey = await prisma.journey.findFirst({
      where: { id: 'mock-aarav-journey' }
    });
    
    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    if (journey.status !== 'RECOVERED') {
      return NextResponse.json({ error: 'Journey is not in RECOVERED state' }, { status: 400 });
    }

    // BUG-04: Derive the active confidence from the recovered fallback route,
    // not from the stale disrupted-route confidence that was left in the DB.
    const mockJourney = mockData.journeys.find(j => j.id === journey.id);
    const recoveredFallback = mockJourney?.fallbacks?.find(
      f => f.routeId === journey.recoveredRouteId
    );

    if (!recoveredFallback) {
      return NextResponse.json(
        { error: `Recovered fallback '${journey.recoveredRouteId}' not found in route data.` },
        { status: 500 }
      );
    }

    validateTransition('RECOVERED', 'ACTIVE');
    
    await prisma.journey.update({
      where: { id: journey.id },
      data: {
        status: 'ACTIVE',
        // Set confidence to the active recovered route's actual confidence value.
        currentConfidence: recoveredFallback.confidence,
        // Clear stale disruption context — it no longer describes the active journey state.
        explainabilityPayload: null,
        riskDetectionTime: null,
      }
    });
    
    return NextResponse.json({
      success: true,
      activeRouteId: journey.recoveredRouteId,
      currentConfidence: recoveredFallback.confidence,
    });
  } catch (error: unknown) {
    if (hasErrorMessage(error, 'Invalid state transition')) {
      return NextResponse.json({ error: errorMessage(error) }, { status: 409 });
    }
    console.error('Error in /api/journey/continue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
