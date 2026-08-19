import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateNetwork } from './generator';
describe('Network Generator', () => {
  it('generates a deterministic small network', () => {
    const config = { seed: 42, stopCount: 50, hubCount: 3, busRouteCount: 5, metroLineCount: 2 };
    const network1 = generateNetwork(config);
    const network2 = generateNetwork(config);
    
    // Determinism
    assert.strictEqual(network1.nodes.size, 53); // 50 stops + 3 hubs
    assert.strictEqual(network2.nodes.size, 53);
    assert.strictEqual(network1.edges.length, network2.edges.length);
    
    // Check hubs exist
    assert.strictEqual(network1.nodes.has('hub-0'), true);
    assert.strictEqual(network1.nodes.has('hub-1'), true);
    assert.strictEqual(network1.nodes.has('hub-2'), true);
  });
});
