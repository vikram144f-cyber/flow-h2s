import test from 'node:test';
import assert from 'node:assert';
import { POST as runSimulationApi } from '../../../app/api/simulation/run/route';

test('Simulation API', async (t) => {
  await t.test('returns error object when commuterCount is invalid', async () => {
    const req = new Request('http://localhost/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify({ commuterCount: -1, seed: 42, strategy: 'comparison' })
    });
    const res = await runSimulationApi(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    
    // The exact mismatch caught: frontend expects totalCommuters to exist if data exists
    // but the API returns an error object without it.
    assert.ok(data.error);
    assert.strictEqual(data.totalCommuters, undefined);
  });

  await t.test('returns successful object when commuterCount is valid', async () => {
    const req = new Request('http://localhost/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify({ commuterCount: 10, seed: 42, strategy: 'comparison' })
    });
    const res = await runSimulationApi(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    assert.strictEqual(data.totalCommuters, 10);
    assert.ok(!data.error);
  });

  await t.test('rejects fractional commuter counts', async () => {
    const req = new Request('http://localhost/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify({ commuterCount: 10.5, seed: 42 })
    });
    const res = await runSimulationApi(req);
    assert.strictEqual(res.status, 400);
  });

  await t.test('rejects unsupported network scales', async () => {
    const req = new Request('http://localhost/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify({ commuterCount: 10, seed: 42, networkScale: 'unknown' })
    });
    const res = await runSimulationApi(req);
    assert.strictEqual(res.status, 400);
    assert.strictEqual((await res.json()).error, 'networkScale is invalid');
  });

  await t.test('rejects malformed JSON', async () => {
    const req = new Request('http://localhost/api/simulation/run', {
      method: 'POST',
      body: '{not-json'
    });
    const res = await runSimulationApi(req);
    assert.strictEqual(res.status, 400);
  });
});
