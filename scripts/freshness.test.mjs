import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementState } from '../assets/monitor-freshness.js';

const now = Date.parse('2026-11-01T12:00:00Z');
const passing = () => Array.from({ length: 4 }, () => ({ status: 'up', updatedAt: now - 60000 }));

test('fresh passing checks are distinguished from absent, partial, and expired results', () => {
  assert.equal(measurementState(passing(), now).state, 'fresh');
  assert.equal(measurementState([], now).state, 'unavailable');
  assert.equal(measurementState(passing().slice(1), now).state, 'unavailable');
  const old = passing();
  old[2].updatedAt = now - 21 * 60000;
  assert.equal(measurementState(old, now).state, 'stale');
});

test('failure, unknown status, malformed dates, and future dates cannot look healthy', () => {
  const failed = passing();
  failed[1].status = 'down';
  assert.equal(measurementState(failed, now).state, 'down');
  failed[1].status = 'unknown';
  assert.equal(measurementState(failed, now).state, 'unavailable');
  failed[1].updatedAt = NaN;
  assert.equal(measurementState(failed, now).state, 'unavailable');
  failed[1].updatedAt = now + 120000;
  assert.equal(measurementState(failed, now).state, 'stale');
});

test('degraded checks do not report that all endpoints passed', () => {
  const degraded = passing();
  degraded[0].status = 'degraded';
  const result = measurementState(degraded, now);
  assert.notEqual(result.state, 'fresh');
  assert.match(result.message, /degraded/);
});
