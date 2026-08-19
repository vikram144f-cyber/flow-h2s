import test from 'node:test';
import assert from 'node:assert';
import { calculateConnectionConfidence } from './confidence';

test('calculateConnectionConfidence', async (t) => {
  await t.test('calculates perfect 100% confidence when buffer heavily exceeds P95 delay', () => {
    // Available time: 20 mins
    // Required: 5 mins
    // Buffer: 15 mins
    // P95: 5 mins
    // Risk Margin: +10 mins
    // Score: 50 + (10 * 10) = 150 -> clamped to 100
    const result = calculateConnectionConfidence({
      predictedArrivalTime: new Date('2026-08-19T08:00:00Z'),
      nextLegDepartureTime: new Date('2026-08-19T08:20:00Z'),
      requiredTransferTimeSeconds: 300,
      historicalP95DelaySeconds: 300,
    });
    
    assert.strictEqual(result.connectionBufferSeconds, 900);
    assert.strictEqual(result.riskMarginSeconds, 600);
    assert.strictEqual(result.confidenceScore, 100);
  });

  await t.test('calculates exactly 50% confidence when risk margin is zero', () => {
    // Available time: 10 mins
    // Required: 5 mins
    // Buffer: 5 mins
    // P95: 5 mins
    // Risk Margin: 0 mins
    // Score: 50 + (0) = 50
    const result = calculateConnectionConfidence({
      predictedArrivalTime: new Date('2026-08-19T08:00:00Z'),
      nextLegDepartureTime: new Date('2026-08-19T08:10:00Z'),
      requiredTransferTimeSeconds: 300,
      historicalP95DelaySeconds: 300,
    });
    
    assert.strictEqual(result.connectionBufferSeconds, 300);
    assert.strictEqual(result.riskMarginSeconds, 0);
    assert.strictEqual(result.confidenceScore, 50);
  });

  await t.test('calculates 0% confidence when risk margin is -5 mins or worse', () => {
    // Available time: 5 mins
    // Required: 5 mins
    // Buffer: 0 mins
    // P95: 5 mins
    // Risk Margin: -5 mins
    // Score: 50 + (-50) = 0
    const result = calculateConnectionConfidence({
      predictedArrivalTime: new Date('2026-08-19T08:00:00Z'),
      nextLegDepartureTime: new Date('2026-08-19T08:05:00Z'),
      requiredTransferTimeSeconds: 300,
      historicalP95DelaySeconds: 300,
    });
    
    assert.strictEqual(result.connectionBufferSeconds, 0);
    assert.strictEqual(result.riskMarginSeconds, -300);
    assert.strictEqual(result.confidenceScore, 0);
  });

  await t.test('handles negative connection buffers (missed connection) with 0% clamp', () => {
    // Available time: 2 mins
    // Required: 5 mins
    // Buffer: -3 mins
    // P95: 5 mins
    // Risk Margin: -8 mins
    const result = calculateConnectionConfidence({
      predictedArrivalTime: new Date('2026-08-19T08:00:00Z'),
      nextLegDepartureTime: new Date('2026-08-19T08:02:00Z'),
      requiredTransferTimeSeconds: 300,
      historicalP95DelaySeconds: 300,
    });
    
    assert.strictEqual(result.connectionBufferSeconds, -180);
    assert.strictEqual(result.riskMarginSeconds, -480);
    assert.strictEqual(result.confidenceScore, 0);
  });
});
