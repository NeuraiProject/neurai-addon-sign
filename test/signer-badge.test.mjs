// The signer shown next to the network in the header.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signerBadge } from '../src/shared/signer-badge.ts';

test('a software account shows no signer', () => {
  assert.equal(signerBadge('software'), null);
  assert.equal(signerBadge(undefined), null);
  assert.equal(signerBadge(null), null);
});

test('Neurai HW: connected, not connected, or unknown where the page holds no device', () => {
  const on = signerBadge('hardware', { hwConnected: true });
  assert.deepEqual([on.kind, on.label, on.state], ['hardware', 'Neurai HW', 'on']);
  assert.match(on.title, /· connected$/);
  const off = signerBadge('hardware', { hwConnected: false });
  assert.equal(off.state, 'off');
  assert.match(off.title, /not connected/);
  const unknown = signerBadge('hardware');
  assert.equal(unknown.state, 'unknown');
  assert.doesNotMatch(unknown.title, /connected/);
});

test('Neurai Connect: an unexpired session is on and says until when', () => {
  const now = Date.UTC(2026, 9, 10, 12);
  const badge = signerBadge('connect', { sessionExpiresAt: now + 3600_000, now });
  assert.deepEqual([badge.kind, badge.label, badge.state], ['connect', 'Neurai Connect', 'on']);
  assert.match(badge.title, /session active until /);
});

test('Neurai Connect: an expired or missing session is off and says how to reconnect', () => {
  const now = Date.UTC(2026, 9, 10, 12);
  for (const expires of [now - 1, now, 0]) {
    const badge = signerBadge('connect', { sessionExpiresAt: expires, now });
    assert.equal(badge.state, 'off', String(expires));
    assert.match(badge.title, /QR code to reconnect/);
  }
});

test('Neurai Connect: unknown until the session has been read', () => {
  assert.equal(signerBadge('connect').state, 'unknown');
});
