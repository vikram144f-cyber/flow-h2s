import { mulberry32 } from './prng';
import mockData from '../../../static-data/mock-gtfs.json';
import { FallbackOption, rankFallbacks, ScoredFallback } from '../routing/fallback-scoring';
import { generateNetwork } from '../network/generator';
import { findAlternativePaths, pathsToFallbacks } from '../network/routing';

export interface SyntheticCommuter {
  id: string;
  wR: number;
  wT: number;
  wC: number;
  wE: number;
  assignedRouteId: string | null;
  assignedRouteTimeDelta: number;
  rankedFallbacks?: ScoredFallback[];
  explanation?: string;
}

export interface RouteLoad {
  routeId: string;
  capacity: number;
  assignedCount: number;
  isOverloaded: boolean;
  utilizationPercentage: number;
  remainingCapacity: number;
  averageAssignedFallbackScore?: number;
}

// Old backward-compatible response
export interface SimulationResult {
  totalCommuters: number;
  affectedCommuters: number;
  routeLoads: RouteLoad[];
  overloadedRoutes: string[];
  baselineSuccessfulJourneys: number;
  baselineFailedJourneys: number;
  baselineAverageDelay: number;
  baselineMaxUtilization: number;
}

// New comparison response
export interface BaseSimulationOutput {
  successfulJourneys: number;
  failedJourneys: number;
  successRate: number;
  routeLoads: RouteLoad[];
  overloadedRoutes: string[];
  maxUtilization: number;
}

export interface ComparisonSimulationResult {
  totalCommuters: number;
  baseline: BaseSimulationOutput;
  flow: BaseSimulationOutput;
  improvement: {
    successRateImprovement: number;
    failedJourneyReduction: number;
    secondaryBottleneckReduction: number;
    maxUtilizationReduction: number;
    averageFallbackScore: number;
  };
  examples: Array<{
    commuterId: string;
    explanation: string;
  }>;
  networkGraph?: any; // Include for visualization
}

export function runSimulation(count: number, seed: number, strategy: 'baseline' | 'comparison' = 'baseline', networkScale: string = 'canonical'): SimulationResult | ComparisonSimulationResult {
  if (count <= 0) {
    throw new Error('Commuter count must be positive');
  }

  const random = mulberry32(seed);
  
  let fallbacks: (FallbackOption & { capacity?: number })[] = [];
  let fastestFallback: any;
  let networkGraph: any = null;

  if (networkScale === 'canonical') {
    const mockJourney = mockData.journeys.find(j => j.id === 'mock-aarav-journey');
    if (!mockJourney || !mockJourney.fallbacks) {
      throw new Error('Mock journey data missing fallbacks');
    }
    fallbacks = mockJourney.fallbacks as (FallbackOption & { capacity?: number })[];
    fastestFallback = [...fallbacks].sort((a, b) => a.timeDelta - b.timeDelta)[0];
  } else {
    let config = { seed, stopCount: 50, hubCount: 3, busRouteCount: 5, metroLineCount: 2 };
    if (networkScale === 'City Medium') config = { seed, stopCount: 100, hubCount: 6, busRouteCount: 10, metroLineCount: 4 };
    if (networkScale === 'City Large') config = { seed, stopCount: 250, hubCount: 12, busRouteCount: 25, metroLineCount: 8 };
    if (networkScale === 'City XLarge') config = { seed, stopCount: 500, hubCount: 20, busRouteCount: 50, metroLineCount: 12 };
    
    const network = generateNetwork(config);
    networkGraph = {
      nodes: Array.from(network.nodes.values()),
      edges: network.edges
    };
    
    const paths = findAlternativePaths(network, 'hub-0', 'stop-10', 5); // Use deterministic O-D
    fallbacks = pathsToFallbacks(paths);
    fastestFallback = fallbacks[0];
  }

  const commuters: SyntheticCommuter[] = [];
  
  // BASELINE DATA
  const baselineRouteCounts: Record<string, number> = {};
  fallbacks.forEach(f => baselineRouteCounts[f.routeId] = 0);
  let totalDelay = 0;

  for (let i = 0; i < count; i++) {
    // --- Commuter Preference Weight Generation ---
    //
    // CORRECT APPROACH: Generate 4 non-negative raw values from the PRNG and
    // normalise by their sum.  This guarantees:
    //   - Every weight is in [0, 1]      (since rawX >= 0 and rawX <= sum)
    //   - wR + wT + wC + wE = 1.0        (by construction)
    //
    // The previous approach applied toFixed(2) to each weight independently.
    // When the four rounded values summed to > 1 (e.g. 1.01) the correction
    // step set finalWE = wE + (1 - 1.01) = wE - 0.01, which produced a
    // NEGATIVE weight when wE was 0.00 — triggering the validator error.
    //
    const rawR = random(); // mulberry32 always returns [0, 1)
    const rawT = random();
    const rawC = random();
    const rawE = random();
    const rawSum = rawR + rawT + rawC + rawE; // always > 0 since every raw > 0

    // Normalise: each component is in [0, 1] and they sum to exactly 1.0
    // in real arithmetic.  Preserve two decimal places for display/scoring,
    // then absorb the ±0.01 floating-point residue into the largest weight
    // so the final vector satisfies the validator's |sum - 1| < 0.001 epsilon
    // while keeping every component >= 0.
    let wR = Math.round((rawR / rawSum) * 100) / 100;
    let wT = Math.round((rawT / rawSum) * 100) / 100;
    let wC = Math.round((rawC / rawSum) * 100) / 100;
    let wE = Math.round((rawE / rawSum) * 100) / 100;

    // Absorb any rounding residue (at most ±0.03 across four terms) into
    // whichever weight is largest — that weight can never go negative.
    const residue = 1.0 - (wR + wT + wC + wE);
    if (residue !== 0) {
      if (wR >= wT && wR >= wC && wR >= wE) {
        wR = Math.round((wR + residue) * 100) / 100;
      } else if (wT >= wR && wT >= wC && wT >= wE) {
        wT = Math.round((wT + residue) * 100) / 100;
      } else if (wC >= wR && wC >= wT && wC >= wE) {
        wC = Math.round((wC + residue) * 100) / 100;
      } else {
        wE = Math.round((wE + residue) * 100) / 100;
      }
    }

    // Baseline: every commuter takes the fastest route (conventional routing)
    const assignedRoute = fastestFallback;
    if (assignedRoute) {
      baselineRouteCounts[assignedRoute.routeId]++;
      totalDelay += assignedRoute.timeDelta;
    }

    commuters.push({
      id: `commuter-${seed}-${i}`,
      wR,
      wT,
      wC,
      wE,
      assignedRouteId: assignedRoute ? assignedRoute.routeId : null,
      assignedRouteTimeDelta: assignedRoute ? assignedRoute.timeDelta : 0
    });
  }

  // Calculate baseline metrics
  const baselineRouteLoads: RouteLoad[] = [];
  let baselineSuccessfulJourneys = 0;
  let baselineFailedJourneys = 0;
  let baselineMaxUtilization = 0;

  fallbacks.forEach(f => {
    const capacity = f.capacity || 0;
    const assignedCount = baselineRouteCounts[f.routeId] || 0;
    const isOverloaded = assignedCount > capacity;
    
    const utilizationPercentage = capacity > 0 ? (assignedCount / capacity) * 100 : 0;
    if (utilizationPercentage > baselineMaxUtilization) {
      baselineMaxUtilization = utilizationPercentage;
    }

    baselineRouteLoads.push({
      routeId: f.routeId,
      capacity,
      assignedCount,
      isOverloaded,
      utilizationPercentage,
      remainingCapacity: Math.max(0, capacity - assignedCount)
    });

    if (assignedCount > capacity) {
      baselineSuccessfulJourneys += capacity;
      baselineFailedJourneys += (assignedCount - capacity);
    } else {
      baselineSuccessfulJourneys += assignedCount;
    }
  });

  const baselineOverloadedRoutes = baselineRouteLoads.filter(r => r.isOverloaded).map(r => r.routeId);

  // If simple strategy requested, return old format
  if (strategy === 'baseline') {
    return {
      totalCommuters: count,
      affectedCommuters: count,
      routeLoads: baselineRouteLoads,
      overloadedRoutes: baselineOverloadedRoutes,
      baselineSuccessfulJourneys,
      baselineFailedJourneys,
      baselineAverageDelay: count > 0 ? Number((totalDelay / count).toFixed(2)) : 0,
      baselineMaxUtilization: Number(baselineMaxUtilization.toFixed(2))
    };
  }

  // ----------------------------------------------------
  // FLOW STRATEGY (Demand-Aware Distribution)
  // ----------------------------------------------------

  // 1. Calculate and cache ranked fallbacks for all commuters
  commuters.forEach(c => {
    c.rankedFallbacks = rankFallbacks(fallbacks, { wR: c.wR, wT: c.wT, wC: c.wC, wE: c.wE });
  });

  // 2. Prevent Order Bias: Sort commuters by their #1 fallback route's final score (descending)
  commuters.sort((a, b) => {
    const aTop = a.rankedFallbacks![0].finalScore;
    const bTop = b.rankedFallbacks![0].finalScore;
    if (bTop !== aTop) return bTop - aTop;
    return a.id.localeCompare(b.id);
  });

  // 3. Assign capacity
  const flowRouteCounts: Record<string, number> = {};
  const flowRouteScoreSum: Record<string, number> = {};
  fallbacks.forEach(f => {
    flowRouteCounts[f.routeId] = 0;
    flowRouteScoreSum[f.routeId] = 0;
  });

  let flowSuccessfulJourneys = 0;
  let flowFailedJourneys = 0;
  let totalFlowAssignedScore = 0;
  const examples: Array<{ commuterId: string; explanation: string }> = [];

  commuters.forEach(c => {
    let assigned = false;
    for (let i = 0; i < c.rankedFallbacks!.length; i++) {
      const option = c.rankedFallbacks![i];
      const capacity = fallbacks.find(f => f.routeId === option.routeId)?.capacity || 0;
      const currentLoad = flowRouteCounts[option.routeId];

      if (currentLoad < capacity) {
        flowRouteCounts[option.routeId]++;
        flowRouteScoreSum[option.routeId] += option.finalScore;
        totalFlowAssignedScore += option.finalScore;
        flowSuccessfulJourneys++;
        assigned = true;

        if (i === 0) {
          c.explanation = `${option.routeId} was selected because it was the highest-scoring route with available capacity.`;
        } else {
          const topOption = c.rankedFallbacks![0];
          c.explanation = `${topOption.routeId} scored ${topOption.finalScore} but was at capacity, so FLOW selected ${option.routeId} with score ${option.finalScore}.`;
        }
        break;
      }
    }

    if (!assigned) {
      flowFailedJourneys++;
      c.explanation = `All viable fallback routes were at maximum capacity.`;
    }

    if (examples.length < 5 && c.explanation && assigned && c.rankedFallbacks![0].routeId !== c.rankedFallbacks!.find(r => r.routeId === c.explanation?.match(/FLOW selected (.*) with/)?.[1])?.routeId) {
       // Only add interesting examples that show redistribution if possible
       examples.push({ commuterId: c.id, explanation: c.explanation });
    }
  });

  // Ensure we have examples if we didn't capture any redistributions
  if (examples.length === 0) {
    commuters.slice(0, 5).forEach(c => examples.push({ commuterId: c.id, explanation: c.explanation || '' }));
  }

  // 4. Calculate FLOW metrics
  const flowRouteLoads: RouteLoad[] = [];
  let flowMaxUtilization = 0;

  fallbacks.forEach(f => {
    const capacity = f.capacity || 0;
    const assignedCount = flowRouteCounts[f.routeId] || 0;
    const isOverloaded = assignedCount > capacity;
    
    const utilizationPercentage = capacity > 0 ? (assignedCount / capacity) * 100 : 0;
    if (utilizationPercentage > flowMaxUtilization) {
      flowMaxUtilization = utilizationPercentage;
    }

    flowRouteLoads.push({
      routeId: f.routeId,
      capacity,
      assignedCount,
      isOverloaded,
      utilizationPercentage,
      remainingCapacity: Math.max(0, capacity - assignedCount),
      averageAssignedFallbackScore: assignedCount > 0 ? Number((flowRouteScoreSum[f.routeId] / assignedCount).toFixed(2)) : 0
    });
  });

  const flowOverloadedRoutes = flowRouteLoads.filter(r => r.isOverloaded).map(r => r.routeId);

  const baselineSuccessRate = Number(((baselineSuccessfulJourneys / count) * 100).toFixed(2));
  const flowSuccessRate = Number(((flowSuccessfulJourneys / count) * 100).toFixed(2));

  return {
    totalCommuters: count,
    baseline: {
      successfulJourneys: baselineSuccessfulJourneys,
      failedJourneys: baselineFailedJourneys,
      successRate: baselineSuccessRate,
      routeLoads: baselineRouteLoads,
      overloadedRoutes: baselineOverloadedRoutes,
      maxUtilization: Number(baselineMaxUtilization.toFixed(2))
    },
    flow: {
      successfulJourneys: flowSuccessfulJourneys,
      failedJourneys: flowFailedJourneys,
      successRate: flowSuccessRate,
      routeLoads: flowRouteLoads,
      overloadedRoutes: flowOverloadedRoutes,
      maxUtilization: Number(flowMaxUtilization.toFixed(2))
    },
    improvement: {
      successRateImprovement: Number((flowSuccessRate - baselineSuccessRate).toFixed(2)),
      failedJourneyReduction: baselineFailedJourneys - flowFailedJourneys,
      secondaryBottleneckReduction: Number((baselineMaxUtilization - flowMaxUtilization).toFixed(2)),
      maxUtilizationReduction: Number((baselineMaxUtilization - flowMaxUtilization).toFixed(2)),
      averageFallbackScore: flowSuccessfulJourneys > 0 ? Number((totalFlowAssignedScore / flowSuccessfulJourneys).toFixed(2)) : 0
    },
    examples: examples.slice(0, 5),
    networkGraph
  };
}
