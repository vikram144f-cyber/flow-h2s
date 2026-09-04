import type { NetworkEdge, NetworkNode } from './modules/network/types';

export interface RouteOption {
  routeId: string;
  type: string;
  confidence: number;
  timeDelta: number;
  costDelta: number;
  ecoImpact: string;
  capacity?: number;
  normalizedScores?: {
    reliability: number;
    time: number;
    cost: number;
    eco: number;
  };
  finalScore?: number;
}

export interface ScoredRouteOption extends RouteOption {
  normalizedScores: {
    reliability: number;
    time: number;
    cost: number;
    eco: number;
  };
  finalScore: number;
}

export interface FallbacksResponse {
  fallbacks: ScoredRouteOption[];
}

export interface JourneyLegResponse {
  id: string;
  type: string;
  routeId: string | null;
  originNode: string;
  destinationNode: string;
  scheduledDeparture: string;
  predictedDeparture: string | null;
  scheduledArrival: string;
  predictedArrival: string | null;
  historicalP95DelayMinutes: number;
  order: number;
}

export interface ExplainabilityResponse {
  whatChanged: string;
  whyItMatters: string;
  journeyImpact: string;
  recommendation: string;
}

export interface JourneyResponse {
  id: string;
  status: string;
  origin: string;
  destination: string;
  currentConfidence: number;
  explainabilityPayload: ExplainabilityResponse | null;
  recoveredRouteId: string | null;
  riskDetectionTime: string | null;
  startTime: string;
  endTime: string | null;
  legs: JourneyLegResponse[];
  selectedRoute: RouteOption & {
    departureTime: string;
    arrivalTime: string;
  } | null;
}

export interface ComparisonOutcome {
  outcome: string;
  success: boolean;
  routeId: string | null;
  confidence?: number;
  finalDelayMinutes: number;
  finalArrivalTime: string;
  riskDetectionTime?: string;
  expectedFailureTime?: string;
}

export interface ComparisonResponse {
  flow: ComparisonOutcome;
  baseline: ComparisonOutcome;
  predictionLeadTimeMinutes: number;
  explanation: string;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface SimulationRouteLoad {
  routeId: string;
  capacity: number;
  assignedCount: number;
  isOverloaded: boolean;
  utilizationPercentage: number;
  remainingCapacity: number;
  averageAssignedFallbackScore?: number;
}

export interface SimulationOutput {
  successfulJourneys: number;
  failedJourneys: number;
  successRate: number;
  routeLoads: SimulationRouteLoad[];
  overloadedRoutes: string[];
  maxUtilization: number;
}

export interface SimulationExample {
  commuterId: string;
  explanation: string;
}

export interface SimulationResponse {
  totalCommuters: number;
  baseline: SimulationOutput;
  flow: SimulationOutput;
  improvement: {
    successRateImprovement: number;
    failedJourneyReduction: number;
    secondaryBottleneckReduction: number;
    maxUtilizationReduction: number;
    averageFallbackScore: number;
  };
  examples: SimulationExample[];
  networkGraph: NetworkGraphData | null;
}

export interface ApiErrorResponse {
  error: string;
}
