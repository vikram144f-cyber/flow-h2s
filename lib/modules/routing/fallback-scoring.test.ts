import test from 'node:test';
import assert from 'node:assert';
import { rankFallbacks, FallbackOption } from './fallback-scoring';

const mockFallbacks: FallbackOption[] = [
  { routeId: 'Route A', type: 'BUS', confidence: 90, timeDelta: 30, costDelta: 2, ecoImpact: 'red' },
  { routeId: 'Route B', type: 'TRAIN', confidence: 60, timeDelta: 5, costDelta: 8, ecoImpact: 'green' },
  { routeId: 'Route C', type: 'METRO', confidence: 50, timeDelta: 60, costDelta: 0, ecoImpact: 'neutral' },
];

test('rankFallbacks validation', async (t) => {
  await t.test('throws error if weights sum to != 1.0', () => {
    assert.throws(() => rankFallbacks(mockFallbacks, { wR: 0.5, wT: 0.5, wC: 0.5, wE: 0.5 }), /must sum exactly to 1.0/);
  });

  await t.test('throws error if weights are negative', () => {
    assert.throws(() => rankFallbacks(mockFallbacks, { wR: 1.5, wT: -0.5, wC: 0, wE: 0 }), /cannot be negative/);
  });

  await t.test('handles floating-point epsilon gracefully', () => {
    // 0.1 + 0.2 + 0.3 + 0.4 = 1.0, but in JS 0.1 + 0.2 = 0.30000000000000004
    const result = rankFallbacks(mockFallbacks, { wR: 0.1, wT: 0.2, wC: 0.3, wE: 0.4 });
    assert.strictEqual(result.length, 3);
  });
});

test('rankFallbacks prioritization', async (t) => {
  await t.test('ranks correctly with equal weights', () => {
    const result = rankFallbacks(mockFallbacks, { wR: 0.25, wT: 0.25, wC: 0.25, wE: 0.25 });
    assert.strictEqual(result[0].routeId, 'Route B');
    assert.strictEqual(result[1].routeId, 'Route A');
    assert.strictEqual(result[2].routeId, 'Route C');
  });

  await t.test('ranks correctly with reliability-first preference', () => {
    const result = rankFallbacks(mockFallbacks, { wR: 1.0, wT: 0, wC: 0, wE: 0 });
    assert.strictEqual(result[0].routeId, 'Route A'); // 90%
  });

  await t.test('ranks correctly with time-first preference', () => {
    const result = rankFallbacks(mockFallbacks, { wR: 0, wT: 1.0, wC: 0, wE: 0 });
    assert.strictEqual(result[0].routeId, 'Route B'); // timeDelta 5
  });

  await t.test('ranks correctly with cost-first preference', () => {
    const result = rankFallbacks(mockFallbacks, { wR: 0, wT: 0, wC: 1.0, wE: 0 });
    assert.strictEqual(result[0].routeId, 'Route C'); // costDelta 0
  });

  await t.test('ranks correctly with eco-first preference', () => {
    const result = rankFallbacks(mockFallbacks, { wR: 0, wT: 0, wC: 0, wE: 1.0 });
    assert.strictEqual(result[0].routeId, 'Route B'); // green
  });
});

test('rankFallbacks boundaries and clamping', async (t) => {
  await t.test('negative time delta and cost delta score 100', () => {
    const fallbacks: FallbackOption[] = [
      { routeId: 'FastCheap', type: 'BUS', confidence: 80, timeDelta: -15, costDelta: -5, ecoImpact: 'green' }
    ];
    const result = rankFallbacks(fallbacks, { wR: 0.25, wT: 0.25, wC: 0.25, wE: 0.25 });
    assert.strictEqual(result[0].normalizedScores.time, 100);
    assert.strictEqual(result[0].normalizedScores.cost, 100);
  });

  await t.test('60+ minute time delta clamps to 0', () => {
    const fallbacks: FallbackOption[] = [
      { routeId: 'Slow', type: 'BUS', confidence: 80, timeDelta: 120, costDelta: 0, ecoImpact: 'green' }
    ];
    const result = rankFallbacks(fallbacks, { wR: 0, wT: 1.0, wC: 0, wE: 0 });
    assert.strictEqual(result[0].normalizedScores.time, 0);
  });

  await t.test('$10+ cost delta clamps to 0', () => {
    const fallbacks: FallbackOption[] = [
      { routeId: 'Expensive', type: 'BUS', confidence: 80, timeDelta: 0, costDelta: 25, ecoImpact: 'green' }
    ];
    const result = rankFallbacks(fallbacks, { wR: 0, wT: 0, wC: 1.0, wE: 0 });
    assert.strictEqual(result[0].normalizedScores.cost, 0);
  });
});

test('rankFallbacks deterministic tie-breaking', async (t) => {
  await t.test('tie-breaker 1: higher connection confidence wins', () => {
    const tiedFallbacks: FallbackOption[] = [
      { routeId: 'A', type: 'BUS', confidence: 80, timeDelta: 30, costDelta: 5, ecoImpact: 'neutral' },
      { routeId: 'B', type: 'BUS', confidence: 90, timeDelta: 30, costDelta: 5, ecoImpact: 'neutral' }
    ];
    // With 0 weight on reliability, both have same final score
    const result = rankFallbacks(tiedFallbacks, { wR: 0, wT: 0.5, wC: 0.5, wE: 0 });
    assert.strictEqual(result[0].finalScore, result[1].finalScore);
    assert.strictEqual(result[0].routeId, 'B'); // Confidence 90 > 80
  });

  await t.test('tie-breaker 2: shorter travel time wins (lower timeDelta)', () => {
    const tiedFallbacks: FallbackOption[] = [
      { routeId: 'A', type: 'BUS', confidence: 80, timeDelta: 40, costDelta: 5, ecoImpact: 'neutral' },
      { routeId: 'B', type: 'BUS', confidence: 80, timeDelta: 20, costDelta: 5, ecoImpact: 'neutral' }
    ];
    // 0 weight on time
    const result = rankFallbacks(tiedFallbacks, { wR: 0.5, wT: 0, wC: 0.5, wE: 0 });
    assert.strictEqual(result[0].finalScore, result[1].finalScore);
    assert.strictEqual(result[0].routeId, 'B'); // TimeDelta 20 < 40
  });

  await t.test('tie-breaker 3: lower cost wins (lower costDelta)', () => {
    const tiedFallbacks: FallbackOption[] = [
      { routeId: 'A', type: 'BUS', confidence: 80, timeDelta: 20, costDelta: 8, ecoImpact: 'neutral' },
      { routeId: 'B', type: 'BUS', confidence: 80, timeDelta: 20, costDelta: 2, ecoImpact: 'neutral' }
    ];
    // 0 weight on cost
    const result = rankFallbacks(tiedFallbacks, { wR: 0.5, wT: 0.5, wC: 0, wE: 0 });
    assert.strictEqual(result[0].finalScore, result[1].finalScore);
    assert.strictEqual(result[0].routeId, 'B'); // CostDelta 2 < 8
  });

  await t.test('tie-breaker 4: routeId ascending', () => {
    const tiedFallbacks: FallbackOption[] = [
      { routeId: 'Z', type: 'BUS', confidence: 80, timeDelta: 20, costDelta: 5, ecoImpact: 'neutral' },
      { routeId: 'A', type: 'BUS', confidence: 80, timeDelta: 20, costDelta: 5, ecoImpact: 'neutral' }
    ];
    // Exactly equal inputs
    const result = rankFallbacks(tiedFallbacks, { wR: 0.25, wT: 0.25, wC: 0.25, wE: 0.25 });
    assert.strictEqual(result[0].finalScore, result[1].finalScore);
    assert.strictEqual(result[0].routeId, 'A'); // 'A' comes before 'Z'
  });
});
