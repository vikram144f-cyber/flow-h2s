export interface FallbackOption {
  routeId: string;
  type: string;
  confidence: number;
  timeDelta: number;
  costDelta: number;
  ecoImpact: 'green' | 'neutral' | 'red';
}

export interface UserWeights {
  wR: number; // Reliability
  wT: number; // Time
  wC: number; // Cost
  wE: number; // Eco
}

export interface ScoredFallback extends FallbackOption {
  normalizedScores: {
    reliability: number;
    time: number;
    cost: number;
    eco: number;
  };
  finalScore: number;
}

// MVP Scoring Heuristics (Not real-world calibrated)
export const TIME_SCORE_ZERO_DELTA_MINUTES = 60;
export const COST_SCORE_ZERO_DELTA_AMOUNT = 10;

export function rankFallbacks(
  fallbacks: FallbackOption[],
  weights: UserWeights
): ScoredFallback[] {
  // 1. Validate weights
  if (weights.wR < 0 || weights.wT < 0 || weights.wC < 0 || weights.wE < 0) {
    throw new Error('Invalid weights: Weights cannot be negative.');
  }

  const sum = weights.wR + weights.wT + weights.wC + weights.wE;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error('Invalid weights: Weights must sum exactly to 1.0.');
  }

  // 2. Score and normalize each fallback
  const scoredFallbacks = fallbacks.map((fallback) => {
    // Reliability is already 0-100
    const relScore = Math.max(0, Math.min(100, fallback.confidence));

    // Time: <=0 delta = 100 points, TIME_SCORE_ZERO_DELTA_MINUTES+ delta = 0 points
    let timeScore = 100;
    if (fallback.timeDelta > 0) {
      timeScore = Math.max(0, 100 - (fallback.timeDelta / TIME_SCORE_ZERO_DELTA_MINUTES) * 100);
    }

    // Cost: <=$0 delta = 100 points, COST_SCORE_ZERO_DELTA_AMOUNT+ delta = 0 points
    let costScore = 100;
    if (fallback.costDelta > 0) {
      costScore = Math.max(0, 100 - (fallback.costDelta / COST_SCORE_ZERO_DELTA_AMOUNT) * 100);
    }

    // Eco: green = 100, neutral = 50, red = 0
    let ecoScore = 50;
    if (fallback.ecoImpact === 'green') ecoScore = 100;
    if (fallback.ecoImpact === 'red') ecoScore = 0;

    const finalScore = 
      (weights.wR * relScore) +
      (weights.wT * timeScore) +
      (weights.wC * costScore) +
      (weights.wE * ecoScore);

    return {
      ...fallback,
      normalizedScores: {
        reliability: relScore,
        time: timeScore,
        cost: costScore,
        eco: ecoScore,
      },
      finalScore: Number(finalScore.toFixed(2)),
    };
  });

  // 3. Sort descending by finalScore with deterministic tie-breaking
  return scoredFallbacks.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    // Tie-breaker 1: Higher Connection Confidence wins
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Tie-breaker 2: Shorter travel time wins (lower timeDelta)
    if (a.timeDelta !== b.timeDelta) {
      return a.timeDelta - b.timeDelta;
    }
    // Tie-breaker 3: Lower cost wins (lower costDelta)
    if (a.costDelta !== b.costDelta) {
      return a.costDelta - b.costDelta;
    }
    // Tie-breaker 4: routeId ascending
    return a.routeId.localeCompare(b.routeId);
  });
}
