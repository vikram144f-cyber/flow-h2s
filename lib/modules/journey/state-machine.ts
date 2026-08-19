export type JourneyState = 
  | 'PLANNED' 
  | 'ACTIVE' 
  | 'AT_RISK' 
  | 'RECOVERY_OFFERED' 
  | 'RECOVERED' 
  | 'COMPLETED';

const VALID_TRANSITIONS: Record<JourneyState, JourneyState[]> = {
  PLANNED: ['ACTIVE'],
  ACTIVE: ['AT_RISK', 'COMPLETED'],
  AT_RISK: ['RECOVERY_OFFERED'],
  RECOVERY_OFFERED: ['RECOVERED'],
  RECOVERED: ['COMPLETED', 'ACTIVE'],
  COMPLETED: []
};

/**
 * Validates if a journey can transition from its current state to the proposed next state.
 * Throws an Error if the transition is invalid.
 */
export function validateTransition(currentState: JourneyState, nextState: JourneyState): boolean {
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(nextState)) {
    throw new Error(`Invalid state transition from ${currentState} to ${nextState}`);
  }
  return true;
}
