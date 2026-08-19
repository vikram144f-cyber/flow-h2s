import test from 'node:test';
import assert from 'node:assert';
import { injectDelayService } from './delay-service';
import { resetDatabaseToDeterministicSeed } from './seed-service';
import { prisma } from '../../db';

// Simple setup/teardown utility using API endpoint logic
async function resetDb() {
  await resetDatabaseToDeterministicSeed();
}

test('injectDelayService', async (t) => {
  // Reset before testing
  await resetDb();

  await t.test('injects +12 minute delay and transitions journey to AT_RISK with correct math', async () => {
    const result = await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.affectedLeg, 'leg-1');
    assert.strictEqual(result.delayAppliedMinutes, 12);
    
    // Original Confidence -> Math: 23m available - 5m req = 18m buffer. Risk Margin = 18m - 5m P95 = 13m. 
    // Score = 50 + (13 * 10) = 180% -> clamped to 100%.
    assert.strictEqual(result.previousConnectionConfidence, 100); 
    assert.strictEqual(result.connectionBufferMinutes.previous, 18);
    assert.strictEqual(result.riskMarginMinutes.previous, 13);
    assert.strictEqual(result.historicalP95DelayMinutesUsed, 5);

    // New Confidence -> Math: 11m available - 5m req = 6m buffer. Risk Margin = 6m - 5m P95 = 1m.
    // Score = 50 + (1 * 10) = 60%.
    assert.strictEqual(result.newConnectionConfidence, 60);
    assert.strictEqual(result.connectionBufferMinutes.new, 6);
    assert.strictEqual(result.riskMarginMinutes.new, 1);
    
    assert.strictEqual(result.previousJourneyState, 'ACTIVE'); // Seeded state
    assert.strictEqual(result.newJourneyState, 'AT_RISK');
    
    assert.ok(result.decisionExplanation);
    assert.strictEqual(result.decisionExplanation.whatChanged, 'Bus 21 is predicted to arrive 12 minutes late.');
    assert.strictEqual(result.decisionExplanation.recommendation, 'Switch to Route B with 93% confidence.');
    
    // Check DB state directly to verify transaction success and preserved schedule
    const journey = await prisma.journey.findUnique({ where: { id: 'mock-aarav-journey' } });
    assert.strictEqual(journey?.status, 'AT_RISK');
    
    const leg = await prisma.leg.findUnique({ where: { id: 'leg-1' } });
    assert.strictEqual(leg?.predictedArrival?.toISOString(), '2026-08-19T08:32:00.000Z');
    // Verify original schedule is strictly preserved!
    assert.strictEqual(leg?.scheduledArrival?.toISOString(), '2026-08-19T08:20:00.000Z');
  });

  await t.test('repeated delay injection is idempotent', async () => {
    // Injecting 12 minutes AGAIN should produce the exact same newArrival (08:32)
    const result = await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    assert.strictEqual(result.newPredictedArrival.toISOString(), '2026-08-19T08:32:00.000Z');
  });

  await t.test('negative delay (early arrival) increases confidence', async () => {
    await resetDb(); 
    // Inject -5 minutes. Buffer = 18 - (-5) = 23m. Risk margin = 18m. Score = 230% -> clamped to 100%.
    const result = await injectDelayService({ legId: 'leg-1', delayMinutes: -5 });
    assert.strictEqual(result.newConnectionConfidence, 100);
    // Does not transition to AT_RISK
    assert.strictEqual(result.newJourneyState, 'ACTIVE'); 
  });

  await t.test('zero delay keeps confidence the same', async () => {
    await resetDb();
    const result = await injectDelayService({ legId: 'leg-1', delayMinutes: 0 });
    assert.strictEqual(result.newConnectionConfidence, result.previousConnectionConfidence);
  });

  await t.test('invalid leg ID throws error', async () => {
    await assert.rejects(
      async () => injectDelayService({ legId: 'invalid-id', delayMinutes: 12 }),
      /not found/
    );
  });
  
  await t.test('invalid delay value throws error', async () => {
    await assert.rejects(
      async () => injectDelayService({ legId: 'leg-1', delayMinutes: NaN }),
      /must be a valid finite number/
    );
  });
});
