// "Test connection" in Settings.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRpcEndpoint, describeRpcCheck, rpcCheckTone } from '../src/popup/expanded/rpc-check.ts';

const TESTNET = '0000008b384aeffecdab182575dc4e86c9f07f90318c65088532660ed9a8a021';
const MAINNET = '00000044d33c0c0ba019be5c0249730424a69cb4c222153322f68c6104484806';

function node(answers) {
  const calls = [];
  const call = async (method, params) => {
    calls.push(method);
    const answer = answers[method];
    if (answer instanceof Error) throw answer;
    return typeof answer === 'function' ? answer(params) : answer;
  };
  return { call, calls };
}

function clock(...times) {
  let i = 0;
  return () => times[Math.min(i++, times.length - 1)];
}

test('the right chain reports its height and how long it took', async () => {
  const { call } = node({ getblockhash: TESTNET, getblockchaininfo: { blocks: 12345, asset_marker: 'xna' } });
  const result = await checkRpcEndpoint(call, TESTNET, { requireAssetMarker: true, now: clock(100, 220) });
  assert.deepEqual(result, { kind: 'ok', blocks: 12345, ms: 120, missingAssetMarker: false });
  assert.equal(describeRpcCheck(result, 'Testnet'), 'Testnet verified · block 12,345 · 120 ms');
  assert.equal(rpcCheckTone(result), 'ok');
});

test('a node of another chain is named as such and asked nothing more', async () => {
  const { call, calls } = node({ getblockhash: MAINNET, getblockchaininfo: { blocks: 1 } });
  const result = await checkRpcEndpoint(call, TESTNET);
  assert.equal(result.kind, 'wrong-chain');
  assert.deepEqual(calls, ['getblockhash']);
  assert.match(describeRpcCheck(result, 'Testnet'), /another chain \(genesis 00000044d33c…\), not Testnet/);
  assert.equal(rpcCheckTone(result), 'bad');
});

test('the genesis comparison ignores case', async () => {
  const { call } = node({ getblockhash: TESTNET.toUpperCase(), getblockchaininfo: { blocks: 7 } });
  assert.equal((await checkRpcEndpoint(call, TESTNET)).kind, 'ok');
});

test('a testnet node without asset_marker is reported, as a warning', async () => {
  const { call } = node({ getblockhash: TESTNET, getblockchaininfo: { blocks: 50 } });
  const result = await checkRpcEndpoint(call, TESTNET, { requireAssetMarker: true, now: clock(0, 5) });
  assert.equal(result.missingAssetMarker, true);
  assert.match(describeRpcCheck(result, 'Testnet'), /does not report asset_marker/);
  assert.equal(rpcCheckTone(result), 'warn');
});

test('on mainnet the asset marker is not required', async () => {
  const { call } = node({ getblockhash: MAINNET, getblockchaininfo: { blocks: 50 } });
  const result = await checkRpcEndpoint(call, MAINNET);
  assert.equal(result.missingAssetMarker, false);
});

test('a node that does not answer is reported with its error', async () => {
  const { call } = node({ getblockhash: new Error('Failed to fetch') });
  const result = await checkRpcEndpoint(call, TESTNET);
  assert.deepEqual(result, { kind: 'error', message: 'Failed to fetch' });
  assert.equal(describeRpcCheck(result, 'Testnet'), 'No answer: Failed to fetch');
});

test('a node without a height is an error', async () => {
  const { call } = node({ getblockhash: TESTNET, getblockchaininfo: {} });
  assert.equal((await checkRpcEndpoint(call, TESTNET)).kind, 'error');
});
