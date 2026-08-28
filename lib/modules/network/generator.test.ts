import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateNetwork } from './generator';
import { findFastestPath } from './routing';
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

  it('keeps the canonical generated destination reachable across city scales', () => {
    const scales = [
      { stopCount: 100, hubCount: 6, busRouteCount: 10, metroLineCount: 4 },
      { stopCount: 250, hubCount: 12, busRouteCount: 25, metroLineCount: 8 },
      { stopCount: 500, hubCount: 20, busRouteCount: 50, metroLineCount: 12 }
    ];

    for (const config of scales) {
      const network = generateNetwork({ seed: 42, ...config });
      assert.ok(findFastestPath(network, 'hub-0', 'stop-10'));
    }
  });
});
