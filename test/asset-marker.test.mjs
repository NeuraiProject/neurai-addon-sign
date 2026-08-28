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

// --- Caché por sesión ---------------------------------------------------
//
// Precalentar el marcador al abrir el formulario quita ~840 ms del camino
// crítico de cada operación. Lo que hay que fijar es que la caché no cambie
// el comportamiento observable: una consulta compartida, ninguna respuesta
// cruzada entre redes, y un fallo que no deje la sesión inservible.

import { createAssetMarkerCache } from '../src/popup/expanded/asset-marker.ts';

/** RPC que cuenta llamadas y devuelve el marcador indicado. */
function markerRpc(marker, { fail = false } = {}) {
  const calls = [];
  const rpc = async (method) => {
    calls.push(method);
    if (fail) throw new Error('socket hang up');
    return { asset_marker: marker };
  };
  return { rpc, calls };
}

test('la caché consulta el nodo una sola vez por red', async () => {
  const { rpc, calls } = markerRpc('xna');
  const cache = createAssetMarkerCache();

  assert.equal(await cache.resolve('xna-test', rpc), 'xna');
  assert.equal(await cache.resolve('xna-test', rpc), 'xna');
  assert.deepEqual(calls, ['getblockchaininfo']);
});

test('dos operaciones simultáneas comparten una consulta', async () => {
  const { rpc, calls } = markerRpc('xna');
  const cache = createAssetMarkerCache();

  const [a, b] = await Promise.all([
    cache.resolve('xna-test', rpc),
    cache.resolve('xna-test', rpc)
  ]);
  assert.equal(a, 'xna');
  assert.equal(b, 'xna');
  assert.equal(calls.length, 1);
});

test('cada red tiene su entrada: no se cruza la respuesta de otra', async () => {
  const cache = createAssetMarkerCache();
  const testnet = markerRpc('xna');
  const mainnet = markerRpc('rvn');

  assert.equal(await cache.resolve('xna-test', testnet.rpc), 'xna');
  assert.equal(await cache.resolve('xna', mainnet.rpc), 'rvn');
  // Y ninguna de las dos ha invalidado a la otra.
  assert.equal(await cache.resolve('xna-test', testnet.rpc), 'xna');
  assert.equal(testnet.calls.length, 1);
  assert.equal(mainnet.calls.length, 1);
});

test('un fallo se propaga y NO se queda cacheado', async () => {
  const cache = createAssetMarkerCache();
  const broken = markerRpc(null, { fail: true });

  await assert.rejects(
    () => cache.resolve('xna-test', broken.rpc),
    /Cannot resolve the NIP-040 asset marker/
  );

  // El siguiente intento vuelve a preguntar en vez de repetir el error.
  const healthy = markerRpc('xna');
  assert.equal(await cache.resolve('xna-test', healthy.rpc), 'xna');
  assert.equal(healthy.calls.length, 1);
});

test('warm no lanza aunque el nodo falle, y resolve sigue dando el error', async () => {
  const cache = createAssetMarkerCache();
  const broken = markerRpc(null, { fail: true });

  cache.warm('xna-test', broken.rpc);          // no debe reventar el hilo de UI
  await new Promise((r) => setTimeout(r, 0));

  await assert.rejects(() => cache.resolve('xna-test', broken.rpc), /getblockchaininfo failed/);
});

test('warm deja el valor listo: resolve posterior no vuelve a consultar', async () => {
  const { rpc, calls } = markerRpc('xna');
  const cache = createAssetMarkerCache();

  cache.warm('xna-test', rpc);
  assert.equal(await cache.resolve('xna-test', rpc), 'xna');
  assert.equal(calls.length, 1);
});
