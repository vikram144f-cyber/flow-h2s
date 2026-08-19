import test from 'node:test';
import assert from 'node:assert';
import { GET as getJourney } from '../../../app/api/journey/route';
import { GET as getFallbacks } from '../../../app/api/journey/fallbacks/route';
import { POST as recoverJourney } from '../../../app/api/journey/recover/route';
import { POST as continueJourney } from '../../../app/api/journey/continue/route';
import { GET as getComparison } from '../../../app/api/journey/comparison/route';
import { resetDatabaseToDeterministicSeed } from './seed-service';
import { injectDelayService } from './delay-service';
import { prisma } from '../../db';

test('Journey API Integration Tests', async (t) => {
  // Reset DB before all tests
  await resetDatabaseToDeterministicSeed();

  await t.test('GET /api/journey returns seeded journey', async () => {
    const res = await getJourney();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.id, 'mock-aarav-journey');
    assert.strictEqual(data.status, 'ACTIVE');
    assert.strictEqual(data.currentConfidence, 100);
  });

  await t.test('GET /api/journey/fallbacks returns sorted fallbacks', async () => {
    const req = new Request('http://localhost/api/journey/fallbacks');
    const res = await getFallbacks(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.fallbacks.length > 0);
    assert.strictEqual(data.fallbacks[0].routeId, 'Route B');
    assert.ok(data.fallbacks[0].finalScore > 0); // Ensures it's actually scored
  });

  await t.test('POST /api/journey/recover fails if not AT_RISK', async () => {
    // Currently ACTIVE
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Route B' })
    });
    const res = await recoverJourney(req);
    assert.strictEqual(res.status, 409); // Invalid state transition
  });

  await t.test('inject delay transitions to AT_RISK and sets payload', async () => {
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    const res = await getJourney();
    const data = await res.json();
    assert.strictEqual(data.status, 'AT_RISK');
    assert.strictEqual(data.currentConfidence, 60);
    assert.ok(data.explainabilityPayload);
    assert.strictEqual(data.explainabilityPayload.journeyImpact, 'Connection Confidence dropped from 100% to 60%.');
    assert.strictEqual(data.explainabilityPayload.recommendation, 'Switch to Route B with 93% confidence.');
  });

  await t.test('POST /api/journey/recover fails with invalid fallback', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Fake Route' })
    });
    const res = await recoverJourney(req);
    assert.strictEqual(res.status, 400); 
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid fallback selected');
  });

  await t.test('POST /api/journey/recover succeeds and preserves recoveredRouteId', async () => {
    // Inject delay first to get to AT_RISK state
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Route B' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const res = await recoverJourney(req);
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.journey.status, 'RECOVERED');
    assert.strictEqual(data.journey.recoveredRouteId, 'Route B');
  });

  await t.test('GET /api/journey/comparison calculates deterministic simulation', async () => {
    const req = new Request('http://localhost/api/journey/comparison');
    const res = await getComparison(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    // 1. Check FLOW outcome
    assert.ok(data.flow.success);
    assert.strictEqual(data.flow.outcome, 'Recovered');
    assert.strictEqual(data.flow.routeId, 'Route B');
    assert.strictEqual(data.flow.finalDelayMinutes, 4); // from fallback
    assert.strictEqual(data.flow.confidence, 93);
    
    // 2. Check Baseline outcome
    assert.strictEqual(data.baseline.success, false);
    assert.strictEqual(data.baseline.outcome, 'Connection missed');
    assert.strictEqual(data.baseline.finalDelayMinutes, 15);
    
    // 3. Check Prediction Lead Time
    assert.strictEqual(data.predictionLeadTimeMinutes, 21);
    
    // 4. Check Explanation
    assert.ok(data.explanation.includes('SIMULATED RESULT'));
  });

  await t.test('GET /api/journey/comparison fails if not RECOVERED', async () => {
    await resetDatabaseToDeterministicSeed();
    const req = new Request('http://localhost/api/journey/comparison');
    const res = await getComparison(req);
    assert.strictEqual(res.status, 400); // Because status is PLANNED now
  });

  await t.test('Continuous flow: RECOVERED -> ACTIVE -> AT_RISK -> RECOVERED', async () => {
    // 1. Setup initial recovery to Route B
    await resetDatabaseToDeterministicSeed();
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    await recoverJourney(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ fallbackRouteId: 'Route B' }), headers: { 'Content-Type': 'application/json' } }));
    
    // 2. RECOVERED -> ACTIVE via continue
    const resContinue = await continueJourney();
    assert.strictEqual(resContinue.status, 200);
    const resGet1 = await getJourney();
    let data = await resGet1.json();
    assert.strictEqual(data.status, 'ACTIVE');
    assert.strictEqual(data.recoveredRouteId, 'Route B');

    // 3. ACTIVE -> AT_RISK via larger delay
    await injectDelayService({ legId: 'leg-1', delayMinutes: 24 });
    const resGet2 = await getJourney();
    data = await resGet2.json();
    assert.strictEqual(data.status, 'AT_RISK');

    // 4. Second recovery with Route C
    const resRecover = await recoverJourney(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ fallbackRouteId: 'Route C' }), headers: { 'Content-Type': 'application/json' } }));
    assert.strictEqual(resRecover.status, 200);
    const resGet3 = await getJourney();
    data = await resGet3.json();
    assert.strictEqual(data.status, 'RECOVERED');
    assert.strictEqual(data.recoveredRouteId, 'Route C');
  });

  // --- BUG-04 REGRESSION TESTS ---

  await t.test('BUG-04: CONTINUE JOURNEY sets confidence to recovered route confidence, not stale disruption value', async () => {
    await resetDatabaseToDeterministicSeed();
    // Route B has confidence=93 in mock-gtfs
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    await recoverJourney(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Route B' }),
      headers: { 'Content-Type': 'application/json' }
    }));

    // Verify pre-continue state: confidence is still 60 (from disruption), not 93
    let res = await getJourney();
    let data = await res.json();
    assert.strictEqual(data.status, 'RECOVERED');
    assert.strictEqual(data.currentConfidence, 60); // stale disruption confidence

    // CONTINUE JOURNEY
    const continueRes = await continueJourney();
    assert.strictEqual(continueRes.status, 200);
    const continueData = await continueRes.json();
    assert.strictEqual(continueData.currentConfidence, 93); // Route B's actual confidence

    // Verify DB state
    res = await getJourney();
    data = await res.json();
    assert.strictEqual(data.status, 'ACTIVE');
    assert.strictEqual(data.currentConfidence, 93); // Route B's confidence, not 60
    assert.strictEqual(data.explainabilityPayload, null); // stale disruption context cleared
    assert.strictEqual(data.riskDetectionTime, null);    // stale disruption context cleared
  });

  await t.test('BUG-04: CONTINUE JOURNEY with Route C sets confidence to 88', async () => {
    await resetDatabaseToDeterministicSeed();
    // Route C has confidence=88 in mock-gtfs
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    await recoverJourney(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Route C' }),
      headers: { 'Content-Type': 'application/json' }
    }));
    await continueJourney();

    const res = await getJourney();
    const data = await res.json();
    assert.strictEqual(data.status, 'ACTIVE');
    assert.strictEqual(data.currentConfidence, 88); // Route C's actual confidence
    assert.strictEqual(data.explainabilityPayload, null);
  });

  await t.test('BUG-04: CONTINUE JOURNEY with Route D sets confidence to 95', async () => {
    await resetDatabaseToDeterministicSeed();
    // Route D has confidence=95 in mock-gtfs
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    await recoverJourney(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Route D' }),
      headers: { 'Content-Type': 'application/json' }
    }));
    await continueJourney();

    const res = await getJourney();
    const data = await res.json();
    assert.strictEqual(data.status, 'ACTIVE');
    assert.strictEqual(data.currentConfidence, 95); // Route D's actual confidence
    assert.strictEqual(data.explainabilityPayload, null);
  });

  await t.test('BUG-04: After CONTINUE, second disruption still correctly transitions ACTIVE -> AT_RISK', async () => {
    await resetDatabaseToDeterministicSeed();
    await injectDelayService({ legId: 'leg-1', delayMinutes: 12 });
    await recoverJourney(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ fallbackRouteId: 'Route B' }),
      headers: { 'Content-Type': 'application/json' }
    }));
    await continueJourney();

    // After continue, confidence = 93 (Route B). Now inject +24 min to cross threshold.
    const result = await injectDelayService({ legId: 'leg-1', delayMinutes: 24 });
    assert.strictEqual(result.newJourneyState, 'AT_RISK');

    const res = await getJourney();
    const data = await res.json();
    assert.strictEqual(data.status, 'AT_RISK');
    assert.ok(data.currentConfidence < 85); // Threshold correctly crossed
    assert.ok(data.explainabilityPayload);   // New disruption payload set
  });

  await t.test('BUG-04: Reset after two recovery cycles restores pristine state', async () => {
    const { resetDatabaseToDeterministicSeed: fullReset } = await import('./seed-service');
    await fullReset();

    const res = await getJourney();
    const data = await res.json();
    assert.strictEqual(data.status, 'ACTIVE');
    assert.strictEqual(data.currentConfidence, 100);
    assert.strictEqual(data.recoveredRouteId, null);
    assert.strictEqual(data.explainabilityPayload, null);
    assert.strictEqual(data.riskDetectionTime, null);
  });
});
