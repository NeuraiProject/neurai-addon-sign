// The RPC must serve the chain the wallet is on.
//
// A node of the testnet before its 2026-09-26 reset answers like the new one
// (same chain name, ports, prefixes and asset marker). Only the genesis block
// tells them apart, and using the wrong chain would show balances and build
// transactions against outputs that do not exist on the right one.
//
// Run with:  npm test

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertRpcChain, resetChainChecks, WrongChainError } from '../src/shared/chain-identity.ts';
import { GENESIS_HASH } from '../src/shared/networks.ts';

const OLD_TESTNET = '000000ecfc5e6324a079542221d00e10362bdc894d56500c414060eea8a3ad5a';

function rpcAnswering(genesis, calls = []) {
  return async (method, params) => {
    calls.push({ method, params });
    if (genesis instanceof Error) throw genesis;
    return genesis;
  };
}

beforeEach(() => resetChainChecks());

test('accepts the genesis of the wallet chain and asks only once per endpoint', async () => {
  const calls = [];
  const rpc = rpcAnswering(GENESIS_HASH.testnet, calls);
  await assertRpcChain('https://rpc-testnet.example/rpc', 'xna-pq-test', rpc);
  await assertRpcChain('https://rpc-testnet.example/rpc', 'xna-test', rpc);
  assert.deepEqual(calls, [{ method: 'getblockhash', params: [0] }]);
});

test('rejects the testnet before its reset', async () => {
  await assert.rejects(
    () => assertRpcChain('https://old.example/rpc', 'xna-test', rpcAnswering(OLD_TESTNET)),
    (error) => {
      assert.ok(error instanceof WrongChainError);
      assert.match(error.message, /before its reset of 2026-09-26/);
      assert.match(error.message, /testnet RPC URL in Settings/);
      return true;
    }
  );
});

test('rejects a mainnet RPC configured for testnet, and the reverse', async () => {
  await assert.rejects(
    () => assertRpcChain('https://main.example/rpc', 'xna-test', rpcAnswering(GENESIS_HASH.mainnet)),
    /serves Neurai mainnet/
  );
  await assert.rejects(
    () => assertRpcChain('https://test.example/rpc', 'xna', rpcAnswering(GENESIS_HASH.testnet)),
    /serves the Neurai testnet/
  );
});

test('a failed check is not cached', async () => {
  const url = 'https://flaky.example/rpc';
  await assert.rejects(() => assertRpcChain(url, 'xna-test', rpcAnswering(new Error('timeout'))), /timeout/);
  await assertRpcChain(url, 'xna-test', rpcAnswering(GENESIS_HASH.testnet));
});
