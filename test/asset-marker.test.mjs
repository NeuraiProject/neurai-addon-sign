// NIP-040 marker resolution.
//
// Every asset payload opens with a 3-byte marker. Until the libraries were
// updated, the extension built asset outputs without one, so the serializer
// used the legacy `rvn` default and any chain past NIP-040 activation rejected
// the transaction with bad-txns-legacy-asset-marker-after-nip040 — the user
// saw a broadcast failure with no usable cause.
//
// These tests pin the failure policy, which is the part that is easy to get
// wrong: the difference between "the node answered without the field" (an
// answer: that node still enforces rvn) and "the node did not answer" (unknown
// state: must not be guessed).
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssetMarker } from '../src/popup/expanded/asset-marker.ts';

/** RPC stub that records what it was asked. */
function rpcReturning(reply, calls = []) {
  return async (method, params) => {
    calls.push({ method, params });
    if (reply instanceof Error) throw reply;
    return reply;
  };
}

test('returns the marker the node reports', async () => {
  for (const marker of ['rvn', 'xna']) {
    const resolved = await resolveAssetMarker(rpcReturning({ chain: 'test', asset_marker: marker }));
    assert.equal(resolved, marker);
  }
});

test('asks the node exactly once, via getblockchaininfo', async () => {
  const calls = [];
  await resolveAssetMarker(rpcReturning({ asset_marker: 'xna' }, calls));
  assert.deepEqual(calls, [{ method: 'getblockchaininfo', params: [] }]);
});

test('a node that predates the field resolves rvn: that is an answer, not a guess', async () => {
  assert.equal(await resolveAssetMarker(rpcReturning({ chain: 'main' })), 'rvn');
  assert.equal(await resolveAssetMarker(rpcReturning({ asset_marker: null })), 'rvn');
});

test('an unknown value throws instead of picking one', async () => {
  await assert.rejects(
    () => resolveAssetMarker(rpcReturning({ asset_marker: 'RVN' })),
    /unknown asset_marker/
  );
  await assert.rejects(
    () => resolveAssetMarker(rpcReturning({ asset_marker: 42 })),
    /unknown asset_marker/
  );
});

test('an RPC failure propagates and is never downgraded to rvn', async () => {
  // The whole point: on a post-activation chain, guessing rvn here produces a
  // transaction the node rejects, far from the cause.
  await assert.rejects(
    () => resolveAssetMarker(rpcReturning(new Error('connection refused'))),
    (error) => {
      assert.match(error.message, /Cannot resolve the NIP-040 asset marker/);
      assert.match(error.message, /connection refused/);
      assert.match(error.message, /bad-txns-legacy-asset-marker-after-nip040/);
      return true;
    }
  );
});

test('a null reply is treated as a node without the field, not as a failure', async () => {
  assert.equal(await resolveAssetMarker(rpcReturning(null)), 'rvn');
});
