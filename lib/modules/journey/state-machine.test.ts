import test from 'node:test';
import assert from 'node:assert';
import { validateTransition, JourneyState } from './state-machine';

test('validateTransition', async (t) => {
  await t.test('allows valid transitions along the happy path', () => {
    assert.strictEqual(validateTransition('PLANNED', 'ACTIVE'), true);
    assert.strictEqual(validateTransition('ACTIVE', 'COMPLETED'), true);
  });

  await t.test('allows valid transitions along the disruption path', () => {
    assert.strictEqual(validateTransition('ACTIVE', 'AT_RISK'), true);
    assert.strictEqual(validateTransition('AT_RISK', 'RECOVERY_OFFERED'), true);
    assert.strictEqual(validateTransition('RECOVERY_OFFERED', 'RECOVERED'), true);
    assert.strictEqual(validateTransition('RECOVERED', 'COMPLETED'), true);
  });

  await t.test('rejects skipping states', () => {
    assert.throws(() => validateTransition('PLANNED', 'AT_RISK'), /Invalid state transition/);
    assert.throws(() => validateTransition('ACTIVE', 'RECOVERY_OFFERED'), /Invalid state transition/);
  });

  await t.test('rejects backwards transitions', () => {
    assert.throws(() => validateTransition('ACTIVE', 'PLANNED'), /Invalid state transition/);
    assert.throws(() => validateTransition('COMPLETED', 'RECOVERED'), /Invalid state transition/);
  });

  await t.test('rejects transitions from terminal state', () => {
    assert.throws(() => validateTransition('COMPLETED', 'ACTIVE'), /Invalid state transition/);
  });
});
