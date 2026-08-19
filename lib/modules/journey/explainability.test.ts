import test from 'node:test';
import assert from 'node:assert';
import { generateExplainabilityPayload } from './explainability';

test('generateExplainabilityPayload', async (t) => {
  await t.test('generates exactly the PRD example text', () => {
    const payload = generateExplainabilityPayload({
      disruptedRouteId: 'Bus 21',
      delayMinutes: 12,
      originalBufferMinutes: 9,
      originalConfidence: 96,
      newConfidence: 58,
      recommendedRouteId: 'Route B',
      recommendedConfidence: 93
    });

    assert.strictEqual(payload.whatChanged, 'Bus 21 is predicted to arrive 12 minutes late.');
    assert.strictEqual(payload.whyItMatters, 'Your 9-minute transfer buffer is no longer sufficient.');
    assert.strictEqual(payload.journeyImpact, 'Connection Confidence dropped from 96% to 58%.');
    assert.strictEqual(payload.recommendation, 'Switch to Route B with 93% confidence.');
  });
});
