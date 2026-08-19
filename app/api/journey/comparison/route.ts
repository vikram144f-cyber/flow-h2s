import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import mockData from '../../../../static-data/mock-gtfs.json';
import { rankFallbacks } from '../../../../lib/modules/routing/fallback-scoring';

export async function GET(request: Request) {
  try {
    // 1. Fetch the journey from DB
    const journey = await prisma.journey.findUnique({
      where: { id: 'mock-aarav-journey' },
      include: { legs: { orderBy: { order: 'asc' } } }
    });

    if (!journey || journey.status !== 'RECOVERED') {
      return NextResponse.json({ error: 'Comparison is only available for RECOVERED journeys.' }, { status: 400 });
    }

    const mockJourney = mockData.journeys.find(j => j.id === journey.id) as any;
    if (!mockJourney) {
      return NextResponse.json({ error: 'Mock journey data not found.' }, { status: 404 });
    }

    // 2. Compute FLOW Outcome
    // FLOW uses the actual recovered route
    const flowFallback = mockJourney.fallbacks?.find((f: any) => f.routeId === journey.recoveredRouteId);
    if (!flowFallback) {
      return NextResponse.json({ error: 'FLOW recovered fallback not found in mock data.' }, { status: 404 });
    }

    // Format times for display (UTC to simple AM/PM for demo purposes)
    const formatTime = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const h = d.getUTCHours();
      const m = pad(d.getUTCMinutes());
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${pad(h12)}:${m} ${ampm}`;
    };

    const flowFinalArrival = new Date(mockJourney.legs[1].scheduledArrival);
    flowFinalArrival.setUTCMinutes(flowFinalArrival.getUTCMinutes() + flowFallback.timeDelta);

    const flowOutcome = {
      outcome: 'Recovered',
      success: true,
      routeId: flowFallback.routeId,
      confidence: flowFallback.confidence,
      finalDelayMinutes: flowFallback.timeDelta,
      finalArrivalTime: formatTime(flowFinalArrival),
      riskDetectionTime: journey.riskDetectionTime ? formatTime(journey.riskDetectionTime) : 'N/A'
    };

    // 3. Compute Baseline Strategy Outcome
    const leg1 = mockJourney.legs[0];
    const leg2 = mockJourney.legs[1];
    const transfer = mockJourney.transfers[0];

    const actualSimulatedDelayMinutes = leg1.actualSimulatedDelayMinutes || 12; // Fallback to 12 if not set
    const leg1Departure = new Date(leg1.scheduledDeparture);
    const leg1Arrival = new Date(leg1.scheduledArrival);
    
    // Baseline arrives at the platform late
    const actualArrivalAtPlatform = new Date(leg1Arrival.getTime() + actualSimulatedDelayMinutes * 60000 + transfer.requiredTransferTime * 1000);
    const leg2Departure = new Date(leg2.scheduledDeparture);

    let baselineSuccess = true;
    let baselineOutcomeStr = 'Connection made';
    let baselineFinalDelay = actualSimulatedDelayMinutes;
    let baselineFinalArrival = new Date(new Date(leg2.scheduledArrival).getTime() + actualSimulatedDelayMinutes * 60000);
    let baselineFailureTime: Date | null = null;
    let baselineRouteId = leg2.routeId;

    if (actualArrivalAtPlatform > leg2Departure) {
      baselineSuccess = false;
      baselineOutcomeStr = 'Connection missed';
      
      // When does the baseline mathematically fail? 
      // It fails when the latest possible arrival time passes.
      baselineFailureTime = new Date(leg2Departure.getTime() - transfer.requiredTransferTime * 1000);

      // Catch the next train based on headway
      const headwayMinutes = leg2.headwayMinutes || 15;
      
      // Wait for the next train
      const minutesLate = (actualArrivalAtPlatform.getTime() - leg2Departure.getTime()) / 60000;
      const missedTrainsCount = Math.ceil(minutesLate / headwayMinutes);
      const nextTrainDeparture = new Date(leg2Departure.getTime() + missedTrainsCount * headwayMinutes * 60000);
      
      // Final arrival of baseline
      baselineFinalArrival = new Date(leg2.scheduledArrival);
      baselineFinalArrival.setUTCMinutes(baselineFinalArrival.getUTCMinutes() + (missedTrainsCount * headwayMinutes));
      baselineFinalDelay = (baselineFinalArrival.getTime() - new Date(leg2.scheduledArrival).getTime()) / 60000;
    }

    const baselineOutcome = {
      outcome: baselineOutcomeStr,
      success: baselineSuccess,
      routeId: baselineRouteId,
      finalDelayMinutes: baselineFinalDelay,
      finalArrivalTime: formatTime(baselineFinalArrival),
      expectedFailureTime: baselineFailureTime ? formatTime(baselineFailureTime) : 'N/A'
    };

    // 4. Compute Prediction Lead Time
    let predictionLeadTimeMinutes = 0;
    if (baselineFailureTime && journey.riskDetectionTime) {
      predictionLeadTimeMinutes = Math.round((baselineFailureTime.getTime() - journey.riskDetectionTime.getTime()) / 60000);
    }

    // 5. Build Explanation
    const explanation = `SIMULATED RESULT: FLOW detected the connection risk ${predictionLeadTimeMinutes} minutes before the fastest-route baseline missed the transfer. The baseline experienced a total actual delay of ${actualSimulatedDelayMinutes} minutes on ${leg1.routeId}, missing the ${leg2Departure.getUTCMinutes()} connection and waiting for the next ${leg2.headwayMinutes}m headway.`;

    return NextResponse.json({
      flow: flowOutcome,
      baseline: baselineOutcome,
      predictionLeadTimeMinutes,
      explanation
    });

  } catch (error: any) {
    console.error('Error in /api/journey/comparison:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
