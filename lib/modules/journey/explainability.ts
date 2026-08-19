export interface ExplainabilityParams {
  disruptedRouteId: string;
  delayMinutes: number;
  originalBufferMinutes: number;
  originalConfidence: number;
  newConfidence: number;
  recommendedRouteId: string;
  recommendedConfidence: number;
}

export interface ExplainabilityPayload {
  whatChanged: string;
  whyItMatters: string;
  journeyImpact: string;
  recommendation: string;
}

/**
 * Generates the deterministic explainability payload exactly as specified in the PRD.
 */
export function generateExplainabilityPayload(params: ExplainabilityParams): ExplainabilityPayload {
  return {
    whatChanged: `${params.disruptedRouteId} is predicted to arrive ${params.delayMinutes} minutes late.`,
    whyItMatters: `Your ${params.originalBufferMinutes}-minute transfer buffer is no longer sufficient.`,
    journeyImpact: `Connection Confidence dropped from ${params.originalConfidence}% to ${params.newConfidence}%.`,
    recommendation: `Switch to ${params.recommendedRouteId} with ${params.recommendedConfidence}% confidence.`
  };
}
