import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runSimulation, SimulationResult, ComparisonSimulationResult } from './generator';
import { rankFallbacks } from '../routing/fallback-scoring';
import { performance } from 'perf_hooks';

describe('Simulation Generator', () => {
  it('generates 100 commuters deterministically in baseline', () => {
    const run1 = runSimulation(100, 42) as SimulationResult;
    const run2 = runSimulation(100, 42) as SimulationResult;

    assert.deepStrictEqual(run1, run2);
    assert.strictEqual(run1.totalCommuters, 100);
  });

  it('runs 1,000 commuters in under 3 seconds in comparison mode', () => {
    const start = performance.now();
    const result = runSimulation(1000, 42, 'comparison') as ComparisonSimulationResult;
    const end = performance.now();
    
    const durationMs = end - start;
    assert.ok(durationMs < 3000, `Simulation took too long: ${durationMs}ms`);
    assert.strictEqual(result.totalCommuters, 1000);
  });

  it('detects overloaded routes based on capacity in baseline', () => {
    const run = runSimulation(1000, 42, 'comparison') as ComparisonSimulationResult;
    
    // In baseline, ALL 1000 are assigned to Route B (fastest).
    // Route B capacity is 200.
    assert.ok(run.baseline.overloadedRoutes.includes('Route B'));
    
    const routeB = run.baseline.routeLoads.find(r => r.routeId === 'Route B');
    assert.strictEqual(routeB?.isOverloaded, true);
    assert.strictEqual(routeB?.assignedCount, 1000);
    
    assert.strictEqual(run.baseline.successfulJourneys, 200);
    assert.strictEqual(run.baseline.failedJourneys, 800);
    assert.strictEqual(run.baseline.successRate, 20); // 20%
  });

  it('FLOW distribution respects capacities and reduces secondary bottlenecks', () => {
    const run = runSimulation(1000, 42, 'comparison') as ComparisonSimulationResult;
    
    // FLOW should spread the load based on capacity and weights
    assert.strictEqual(run.flow.overloadedRoutes.length, 0);
    
    // Let's verify no individual route exceeded capacity
    run.flow.routeLoads.forEach(r => {
      assert.strictEqual(r.isOverloaded, false);
      assert.ok(r.assignedCount <= r.capacity);
    });

    // We have total capacity: Route B (200), Route C (800), Route D (350)
    // 1000 commuters easily fit within the total 1350 capacity.
    assert.strictEqual(run.flow.successfulJourneys, 1000);
    assert.strictEqual(run.flow.failedJourneys, 0);
    assert.strictEqual(run.flow.successRate, 100); // 100% success!

    // Improvement should be massive
    assert.strictEqual(run.improvement.successRateImprovement, 80);
    assert.strictEqual(run.improvement.failedJourneyReduction, 800);
    assert.ok(run.improvement.secondaryBottleneckReduction > 0);
  });

  it('provides explainable decisions for examples', () => {
    const run = runSimulation(1000, 42, 'comparison') as ComparisonSimulationResult;
    assert.ok(run.examples.length <= 5);
    
    // Ensure examples contain the reason string
    run.examples.forEach(ex => {
      assert.ok(ex.explanation.includes('was selected'));
    });
  });

  it('throws on invalid commuter count', () => {
    assert.throws(() => runSimulation(0, 42), /Commuter count must be positive/);
  });

  // -------------------------------------------------------------------------
  // Weight-Generation Regression Tests
  // Guards against the "Invalid weights: Weights cannot be negative" bug.
  //
  // Root cause was: toFixed(2) rounding applied independently to each weight
  // could make their sum > 1. The correction step then set
  //   finalWE = wE + (1 - sum)
  // which produced a NEGATIVE wE when sum > 1 and wE was already 0.
  //
  // Fix: generate 4 raw values, normalise by their sum, then absorb the
  // ±rounding residue into the LARGEST weight (which can never go negative).
  // -------------------------------------------------------------------------

  /**
   * Re-implements the fixed weight-generation algorithm from generator.ts so
   * we can inspect individual weight vectors without exposing private state.
   * Must be kept in sync with generator.ts's loop body.
   */
  function extractWeightVectors(count: number, seed: number): Array<{wR:number,wT:number,wC:number,wE:number}> {
    function mulberry32(s: number) {
      return function() {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const rng = mulberry32(seed);
    const results: Array<{wR:number,wT:number,wC:number,wE:number}> = [];
    for (let i = 0; i < count; i++) {
      const rawR = rng(), rawT = rng(), rawC = rng(), rawE = rng();
      const rawSum = rawR + rawT + rawC + rawE;
      let wR = Math.round((rawR / rawSum) * 100) / 100;
      let wT = Math.round((rawT / rawSum) * 100) / 100;
      let wC = Math.round((rawC / rawSum) * 100) / 100;
      let wE = Math.round((rawE / rawSum) * 100) / 100;
      const residue = 1.0 - (wR + wT + wC + wE);
      if (residue !== 0) {
        if (wR >= wT && wR >= wC && wR >= wE) wR = Math.round((wR + residue) * 100) / 100;
        else if (wT >= wR && wT >= wC && wT >= wE) wT = Math.round((wT + residue) * 100) / 100;
        else if (wC >= wR && wC >= wT && wC >= wE) wC = Math.round((wC + residue) * 100) / 100;
        else wE = Math.round((wE + residue) * 100) / 100;
      }
      results.push({ wR, wT, wC, wE });
    }
    return results;
  }

  it('REGRESSION: 1,000 generated commuters contain ZERO negative weights', () => {
    const weights = extractWeightVectors(1000, 42);
    let negativeCount = 0;
    weights.forEach(w => {
      if (w.wR < 0 || w.wT < 0 || w.wC < 0 || w.wE < 0) negativeCount++;
    });
    assert.strictEqual(negativeCount, 0,
      `Found ${negativeCount} commuter(s) with at least one negative weight — bug regressed`);
  });

  it('REGRESSION: every weight vector sums to 1.0 within validator epsilon (0.001)', () => {
    const weights = extractWeightVectors(1000, 42);
    const EPSILON = 0.001; // same tolerance as rankFallbacks validator
    let outOfRange = 0;
    weights.forEach(w => {
      const s = w.wR + w.wT + w.wC + w.wE;
      if (Math.abs(s - 1.0) > EPSILON) outOfRange++;
    });
    assert.strictEqual(outOfRange, 0,
      `Found ${outOfRange} weight vector(s) whose sum deviates from 1.0 by more than ${EPSILON}`);
  });

  it('REGRESSION: same seed produces exactly the same weight vectors (determinism)', () => {
    const a = extractWeightVectors(100, 42);
    const b = extractWeightVectors(100, 42);
    assert.deepStrictEqual(a, b, 'Same seed must produce identical weight vectors');
  });

  it('REGRESSION: different seed produces a different deterministic population', () => {
    const a = extractWeightVectors(100, 42);
    const b = extractWeightVectors(100, 99);
    const allSame = a.every((w, i) =>
      w.wR === b[i].wR && w.wT === b[i].wT && w.wC === b[i].wC && w.wE === b[i].wE
    );
    assert.strictEqual(allSame, false, 'Different seeds should produce different populations');
  });

  it('REGRESSION: 1,000 commuter comparison simulation completes without weight-validation errors', () => {
    // If any generated weight is negative, rankFallbacks would throw inside runSimulation.
    // A successful result proves the entire population passed validation.
    assert.doesNotThrow(() => {
      const result = runSimulation(1000, 42, 'comparison') as ComparisonSimulationResult;
      assert.strictEqual(result.totalCommuters, 1000);
    }, 'runSimulation(1000) must not throw a weight-validation error');
  });

  it('REGRESSION: 5,000 commuter comparison simulation completes without weight-validation errors', () => {
    assert.doesNotThrow(() => {
      const result = runSimulation(5000, 42, 'comparison') as ComparisonSimulationResult;
      assert.strictEqual(result.totalCommuters, 5000);
    }, 'runSimulation(5000) must not throw a weight-validation error');
  });

  it('REGRESSION: validator still rejects manually supplied negative weights', () => {
    assert.throws(
      () => rankFallbacks([], { wR: -0.1, wT: 0.5, wC: 0.4, wE: 0.2 }),
      /Weights cannot be negative/
    );
  });

  it('REGRESSION: validator still rejects weights that do not sum to 1.0', () => {
    assert.throws(
      () => rankFallbacks([], { wR: 0.5, wT: 0.5, wC: 0.5, wE: 0.5 }),
      /Weights must sum exactly to 1\.0/
    );
  });
});
