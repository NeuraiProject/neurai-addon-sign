// Wallet network labels against neurai-key 5, address families and sizes.
//
// neurai-key 5 reused the extension's labels for other address types: its
// `xna` is ECDSA witness v3. Passing an addon label to the library unmapped
// derives another address without any error, so the mapping is pinned here.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLET_NETWORKS,
  UNAVAILABLE_NETWORKS,
  toKeyNetwork,
  walletFamily,
  isTestnetNetwork,
  isNetworkAvailable,
  expectedGenesis,
  addressKind,
  scriptKind,
  estimateTxVbytes,
  feeSatsForVbytes,
  prevoutKind,
  dustThresholdSats,
  obsoleteAddressMessage,
  reencodeObsoleteAddress
} from '../src/shared/networks.ts';

test('mainnet labels keep their 4.x derivation', () => {
  assert.equal(toKeyNetwork('xna'), 'xna-legacy');
  assert.equal(toKeyNetwork('xna-legacy'), 'xna-old-legacy');
  assert.equal(toKeyNetwork('xna-test'), 'xna-legacy-test');
  assert.equal(toKeyNetwork('xna-legacy-test'), 'xna-legacy-test');
});

test('the witness families map to their neurai-key 5 labels', () => {
  assert.equal(toKeyNetwork('xna-ecdsa'), 'xna');
  assert.equal(toKeyNetwork('xna-ecdsa-test'), 'xna-test');
  assert.equal(toKeyNetwork('xna-pq'), 'xna-pq');
  assert.equal(toKeyNetwork('xna-pq-test'), 'xna-pq-test');
});

test('an unknown or missing label is mainnet Legacy', () => {
  assert.equal(toKeyNetwork(undefined), 'xna-legacy');
  assert.equal(toKeyNetwork('nonsense'), 'xna-legacy');
  assert.equal(isTestnetNetwork(undefined), false);
});

test('families and chains', () => {
  const expected = {
    'xna': ['legacy', false], 'xna-legacy': ['legacy', false],
    'xna-ecdsa': ['ecdsa', false], 'xna-pq': ['pq', false],
    'xna-test': ['legacy', true], 'xna-legacy-test': ['legacy', true],
    'xna-ecdsa-test': ['ecdsa', true], 'xna-pq-test': ['pq', true]
  };
  assert.deepEqual(Object.keys(expected).sort(), [...WALLET_NETWORKS].sort());
  for (const [network, [family, testnet]] of Object.entries(expected)) {
    assert.equal(walletFamily(network), family, network);
    assert.equal(isTestnetNetwork(network), testnet, network);
  }
});

test('the witness families are not offered on mainnet', () => {
  assert.deepEqual([...UNAVAILABLE_NETWORKS].sort(), ['xna-ecdsa', 'xna-pq']);
  assert.equal(isNetworkAvailable('xna-ecdsa-test'), true);
  assert.equal(isNetworkAvailable('xna-pq-test'), true);
  assert.equal(isNetworkAvailable('xna'), true);
  assert.equal(isNetworkAvailable('bogus'), false);
});

test('each chain has its own genesis; testnet is the 2026-09-26 reset', () => {
  assert.equal(expectedGenesis('xna-pq-test'), '0000008b384aeffecdab182575dc4e86c9f07f90318c65088532660ed9a8a021');
  assert.equal(expectedGenesis('xna'), '00000044d33c0c0ba019be5c0249730424a69cb4c222153322f68c6104484806');
});

const SAMPLES = {
  p2pkh: ['NLhdtwjgrcEkRqjJZkRY4sjhkJ93EytLeE', 'tDjYjjNMUiEfSKxSWB5RhgNqFWHCzdGtf3'],
  ecdsa: [
    'nq1rut29h39kfgek5r4fz2y8c0sg66lpvmszt7l58qw47hhxehgq5xwqnwmrj8',
    'tnq1rpqlhk9qucn28drzp33ugu2unxqf7y7qq887ll2q644739m49ph0sluj0re'
  ],
  pq: [
    'pq1z5ruu6wgf98pra84y7etr7qdnlfellpe2pmw5t3esw5dv2e50m6uqvtv3mc',
    'tpq1zxu7utdtg4xxghu793rrpxd0whwfns2kaekgadnvk2l63f789a8ysrcg5fq'
  ],
  authscript: ['tnc1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsjrz24f']
};

test('addresses are classified by family', () => {
  for (const [kind, addresses] of Object.entries(SAMPLES)) {
    for (const address of addresses) assert.equal(addressKind(address), kind, address);
  }
  assert.equal(addressKind('tnq1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsjrz24f'), 'obsolete');
  assert.equal(addressKind(''), 'unknown');
  assert.equal(addressKind('tnq1rshort'), 'unknown');
});

test('an old-spelling AuthScript recipient gets an explanation', () => {
  assert.match(
    obsoleteAddressMessage('tnq1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsjrz24f'),
    /nc1p… \/ tnc1p…/
  );
  assert.equal(obsoleteAddressMessage(SAMPLES.ecdsa[1]), null);
});

test('scripts are classified by their witness version, with or without an asset suffix', () => {
  const program = 'ab'.repeat(32);
  assert.equal(scriptKind('76a914' + '11'.repeat(20) + '88ac'), 'p2pkh');
  assert.equal(scriptKind('76a914' + '11'.repeat(20) + '88acc01572766e74'), 'p2pkh');
  assert.equal(scriptKind('5120' + program), 'authscript');
  assert.equal(scriptKind('5220' + program), 'pq');
  assert.equal(scriptKind('5320' + program + 'c0'), 'ecdsa');
  assert.equal(scriptKind('5320'), 'unknown');
});

test('transaction size follows the input families', () => {
  const p2pkh = '76a914' + '11'.repeat(20) + '88ac';
  const ecdsa = '5320' + 'ab'.repeat(32);
  const pq = '5220' + 'ab'.repeat(32);
  assert.equal(prevoutKind(ecdsa, SAMPLES.p2pkh[1]), 'ecdsa');
  assert.equal(prevoutKind(undefined, SAMPLES.pq[1]), 'pq');
  // 10 + 148 + 34 + 34
  assert.equal(estimateTxVbytes([prevoutKind(p2pkh)], [SAMPLES.p2pkh[1], SAMPLES.p2pkh[1]]), 226);
  // 10 + 0.5 + 70 + 43 + 43
  assert.equal(estimateTxVbytes([prevoutKind(ecdsa)], [SAMPLES.ecdsa[1], SAMPLES.ecdsa[1]]), 167);
  // 10 + 0.5 + 977.25 + 43 → 1031
  assert.equal(estimateTxVbytes([prevoutKind(pq)], [SAMPLES.pq[1]]), 1031);
});

test('fees are XNA per 1000 vbytes, rounded up to the satoshi', () => {
  assert.equal(feeSatsForVbytes(1000, 0.01), 1000000n);
  assert.equal(feeSatsForVbytes(1193, 0.015), 1789500n);
  assert.equal(feeSatsForVbytes(1, 0.0000001), 1n);
});

test('dust follows the size of the input that will spend the output', () => {
  assert.equal(dustThresholdSats(SAMPLES.p2pkh[0]), 546n);
  assert.equal(dustThresholdSats(SAMPLES.pq[1]), 3060n);
  assert.equal(dustThresholdSats(SAMPLES.authscript[0]), 3060n);
  assert.equal(dustThresholdSats(SAMPLES.ecdsa[1]), 336n);
});

test('an old-spelling AuthScript address is re-encoded with the same program', () => {
  // Vectors from the bech32 package: same words, other HRP.
  assert.equal(
    reencodeObsoleteAddress('tnq1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsqhmkut'),
    'tnc1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsjrz24f'
  );
  assert.equal(
    reencodeObsoleteAddress('nq1pymrr03uj3wq0224ura2zh2h2tm552m28l8t9dzmjywp56a6r3h9s3kyd0c'),
    'nc1pymrr03uj3wq0224ura2zh2h2tm552m28l8t9dzmjywp56a6r3h9srza3x6'
  );
  // Wrong checksum, or not an old spelling at all.
  assert.equal(reencodeObsoleteAddress('tnq1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsqhmkuu'), null);
  assert.equal(reencodeObsoleteAddress(SAMPLES.ecdsa[1]), null);
  assert.equal(reencodeObsoleteAddress(SAMPLES.p2pkh[0]), null);
});
