// Stored accounts after neurai-key 5 and the testnet reset.
//
// A software PQ account stored the AuthScript v1 address of its key, which
// current nodes reject in its old spelling; the PQ wallet is now witness v2.
// A hardware PQ account keeps the v1 family but must be re-spelled nc1p…/tnc1p….
// Legacy accounts must not move: their funds are on those addresses.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateWallet, migrateAccounts } from '../src/shared/migrations.ts';

const OLD_V1 = 'tnq1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsqhmkut';
const NEW_V1 = 'tnc1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsjrz24f';
const V2 = 'tpq1zxu7utdtg4xxghu793rrpxd0whwfns2kaekgadnvk2l63f789a8ysrcg5fq';

function pqAddressStub(calls = []) {
  return (network, publicKey) => {
    calls.push({ network, publicKey });
    return V2;
  };
}

test('a software PQ account moves to the v2 address of its public key', () => {
  const calls = [];
  const wallet = { address: OLD_V1, publicKey: 'ab'.repeat(1312), network: 'xna-pq-test', seedKeyEnc: { v: 1 } };
  const migrated = migrateWallet(wallet, pqAddressStub(calls));
  assert.equal(migrated.address, V2);
  assert.deepEqual(migrated.seedKeyEnc, { v: 1 }, 'the key material is kept');
  assert.deepEqual(calls, [{ network: 'xna-pq-test', publicKey: 'ab'.repeat(1312) }]);
  assert.equal(wallet.address, OLD_V1, 'the input is not mutated');
});

test('an account already on its current address is left alone', () => {
  assert.equal(migrateWallet({ address: V2, publicKey: 'ab', network: 'xna-pq-test' }, pqAddressStub()), null);
});

test('a hardware PQ account keeps the v1 family, re-spelled', () => {
  const migrated = migrateWallet({ address: OLD_V1, network: 'xna-pq-test', walletType: 'hardware' }, pqAddressStub());
  assert.equal(migrated.address, NEW_V1);
});

test('Legacy accounts never move', () => {
  for (const network of ['xna', 'xna-legacy', 'xna-test', 'xna-legacy-test']) {
    const calls = [];
    assert.equal(migrateWallet({ address: 'NLhdtwjgrcEkRqjJZkRY4sjhkJ93EytLeE', publicKey: '02ab', network }, pqAddressStub(calls)), null);
    assert.equal(calls.length, 0);
  }
});

test('a failing derivation leaves the account as it is', () => {
  const wallet = { address: OLD_V1, publicKey: 'zz', network: 'xna-pq-test' };
  assert.equal(migrateWallet(wallet, () => { throw new Error('bad key'); }), null);
});

test('a record reports whether anything changed', () => {
  const record = {
    1: { address: 'tDjYjjNMUiEfSKxSWB5RhgNqFWHCzdGtf3', network: 'xna-test' },
    2: { address: OLD_V1, publicKey: 'ab', network: 'xna-pq-test' },
    3: null
  };
  const { accounts, changed } = migrateAccounts(record, pqAddressStub());
  assert.equal(changed, true);
  assert.equal(accounts[1], record[1]);
  assert.equal(accounts[2].address, V2);
  assert.equal(accounts[3], null);
  assert.equal(migrateAccounts({ 1: record[1] }, pqAddressStub()).changed, false);
});
