export interface ConfidenceParams {
  predictedArrivalTime: Date;
  nextLegDepartureTime: Date;
  requiredTransferTimeSeconds: number;
  historicalP95DelaySeconds: number;
}

export interface ConfidenceResult {
  connectionBufferSeconds: number;
  riskMarginSeconds: number;
  confidenceScore: number;
}

/**
 * Calculates the connection confidence using the FLOW Linear Clamp Model.
 */
export function calculateConnectionConfidence(params: ConfidenceParams): ConfidenceResult {
  // 1. Calculate Available Transfer Time
  const availableTimeSeconds = (params.nextLegDepartureTime.getTime() - params.predictedArrivalTime.getTime()) / 1000;
  
  // 2. Calculate Connection Buffer
  const connectionBufferSeconds = availableTimeSeconds - params.requiredTransferTimeSeconds;
  
  // 3. Calculate Risk Margin
  const riskMarginSeconds = connectionBufferSeconds - params.historicalP95DelaySeconds;
  
  // 4. Calculate Confidence Score: MAX(0, MIN(100, 50 + (Risk Margin Minutes * 10)))
  const riskMarginMinutes = riskMarginSeconds / 60;
  let confidenceScore = 50 + (riskMarginMinutes * 10);
  
  // Clamp between 0 and 100
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));
  
  return {
    connectionBufferSeconds,
    riskMarginSeconds,
    confidenceScore: Math.round(confidenceScore)
  };
}
