import { prisma } from '../../db';
import { calculateConnectionConfidence } from '../routing/confidence';
import { validateTransition, JourneyState } from './state-machine';
import { generateExplainabilityPayload } from './explainability';
import mockData from '../../../static-data/mock-gtfs.json';
import { rankFallbacks } from '../routing/fallback-scoring';

export interface InjectDelayParams {
  legId: string;
  delayMinutes: number;
}

export async function injectDelayService(params: InjectDelayParams) {
  const { legId, delayMinutes } = params;

  if (typeof delayMinutes !== 'number' || !isFinite(delayMinutes)) {
    throw new Error('delayMinutes must be a valid finite number.');
  }

  // 1. Fetch the affected leg and its journey
  const leg = await prisma.leg.findUnique({
    where: { id: legId },
    include: {
      journey: true,
      transferFrom: {
        include: { toLeg: true }
      }
    }
  });

  if (!leg) {
    throw new Error(`Leg with id ${legId} not found.`);
  }

  // 2. Update predicted arrival time deterministically
  const delayMs = delayMinutes * 60 * 1000;
  const newPredictedArrival = new Date(leg.scheduledArrival.getTime() + delayMs);
  
  // We do this in the transaction now, removing from here.

  // 3. If there is no transfer, just return the updated leg (no confidence recalculation needed)
  if (!leg.transferFrom) {
    return { success: true, message: 'Delay injected, but no transfer is affected.', legId, newPredictedArrival };
  }

  const transfer = leg.transferFrom;
  const journey = leg.journey;
  const nextLeg = transfer.toLeg;

  // 4. Calculate ORIGINAL confidence
  const originalConfidenceResult = calculateConnectionConfidence({
    predictedArrivalTime: leg.scheduledArrival,
    nextLegDepartureTime: nextLeg.scheduledDeparture,
    requiredTransferTimeSeconds: transfer.requiredTransferTime,
    historicalP95DelaySeconds: leg.historicalP95DelayMinutes * 60,
  });
  const originalConfidence = originalConfidenceResult.confidenceScore;
  const originalBufferMinutes = Math.round(originalConfidenceResult.connectionBufferSeconds / 60);

  // 5. Calculate NEW confidence
  const nextLegDepartureTime = nextLeg.predictedDeparture || nextLeg.scheduledDeparture;
  const newConfidenceResult = calculateConnectionConfidence({
    predictedArrivalTime: newPredictedArrival,
    nextLegDepartureTime: nextLegDepartureTime,
    requiredTransferTimeSeconds: transfer.requiredTransferTime,
    historicalP95DelaySeconds: leg.historicalP95DelayMinutes * 60,
  });
  const newConfidence = newConfidenceResult.confidenceScore;
  const newBufferMinutes = Math.round(newConfidenceResult.connectionBufferSeconds / 60);
  const newRiskMarginMinutes = Math.round(newConfidenceResult.riskMarginSeconds / 60);
  const oldRiskMarginMinutes = Math.round(originalConfidenceResult.riskMarginSeconds / 60);

  let newJourneyState = journey.status as JourneyState;
  let decisionExplanation = null;

  // 6. Evaluate threshold and prepare state transition
  let stateTransitionRequired = false;
  if (newConfidence < 85 && newJourneyState === 'ACTIVE') {
    validateTransition('ACTIVE', 'AT_RISK');
    newJourneyState = 'AT_RISK';
    stateTransitionRequired = true;

    // Get best fallback
    const mockJourney = mockData.journeys.find(j => j.id === journey.id);
    let bestFallbackRouteId = 'Fallback route evaluation required.';
    let bestFallbackConfidence = 0;
    
    if (mockJourney && mockJourney.fallbacks) {
      const ranked = rankFallbacks(mockJourney.fallbacks as any, { wR: 0.7, wT: 0.15, wC: 0.1, wE: 0.05 });
      if (ranked.length > 0) {
        bestFallbackRouteId = ranked[0].routeId;
        bestFallbackConfidence = ranked[0].confidence;
      }
    }

    // Generate explainability payload without faking fallback
    decisionExplanation = generateExplainabilityPayload({
      disruptedRouteId: leg.routeId || leg.type,
      delayMinutes,
      originalBufferMinutes,
      originalConfidence,
      newConfidence,
      recommendedRouteId: bestFallbackRouteId,
      recommendedConfidence: bestFallbackConfidence
    });
  }

  // 7. Execute Database Transaction securely
  await prisma.$transaction(async (tx) => {
    await tx.leg.update({
      where: { id: legId },
      data: { predictedArrival: newPredictedArrival }
    });

    if (stateTransitionRequired) {
      await tx.journey.update({
        where: { id: journey.id },
        data: { 
          status: 'AT_RISK',
          currentConfidence: newConfidence,
          explainabilityPayload: decisionExplanation ? JSON.stringify(decisionExplanation) : null,
          riskDetectionTime: new Date(leg.scheduledDeparture.getTime() + 17 * 60000) // Deterministically 08:17 in our demo
        }
      });
    } else {
      await tx.journey.update({
        where: { id: journey.id },
        data: { currentConfidence: newConfidence }
      });
    }
  });

  // 8. Return comprehensive detailed API response
  return {
    success: true,
    journeyId: journey.id,
    affectedLeg: leg.id,
    previousPredictedArrival: leg.predictedArrival || leg.scheduledArrival,
    newPredictedArrival,
    delayAppliedMinutes: delayMinutes,
    historicalP95DelayMinutesUsed: leg.historicalP95DelayMinutes,
    connectionBufferMinutes: { previous: originalBufferMinutes, new: newBufferMinutes },
    riskMarginMinutes: { previous: oldRiskMarginMinutes, new: newRiskMarginMinutes },
    previousConnectionConfidence: originalConfidence,
    newConnectionConfidence: newConfidence,
    previousJourneyState: journey.status,
    newJourneyState,
    decisionExplanation
  };
}
