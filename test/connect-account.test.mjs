// The whole NeuraiWallet account from its extended public key.
//
// The addresses derived here must be exactly the ones the phone uses, or the
// extension would show (and spend from) another wallet. The key is checked
// against the account before it is trusted.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HDKey } from '@scure/bip32';
import { getAddressPair, getHDKey, publicKeyToAddress } from '@neuraiproject/neurai-key';
import {
  createAddressDeriver,
  discoverAddresses,
  parseAccountXpubAnswer,
  walletAddressSet,
  watchesConnectAccount,
  GAP_LIMIT
} from '../src/shared/connect-account.ts';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
/** What NeuraiWallet sends (blue_modules/neurai/connect/xpub.ts). */
const share = (keyNetwork, path, addressType) => ({ xpub: getHDKey(keyNetwork, MNEMONIC).derive(path).publicExtendedKey, path, addressType });
const ECDSA_TEST = share('xna-test', "m/84'/1'/0'", 'ecdsa');
const LEGACY_TEST = share('xna-legacy-test', "m/44'/1'/0'", 'legacy');
const LEGACY_MAIN = share('xna-legacy', "m/44'/1900'/0'", 'legacy');

const deriverFor = (info, network) => createAddressDeriver(info, network, (x, v) => HDKey.fromExtendedKey(x, v), publicKeyToAddress);

test('the derived receive and change addresses are the wallet ones, in every family', () => {
  for (const [info, network, keyNetwork] of [
    [ECDSA_TEST, 'xna-ecdsa-test', 'xna-test'],
    [LEGACY_TEST, 'xna-test', 'xna-legacy-test'],
    [LEGACY_MAIN, 'xna', 'xna-legacy']
  ]) {
    const derive = deriverFor(parseAccountXpubAnswer(info, network), network);
    for (const index of [0, 3, 19]) {
      const pair = getAddressPair(keyNetwork, MNEMONIC, 0, index);
      assert.equal(derive(0, index), pair.external.address, `${network} receive ${index}`);
      assert.equal(derive(1, index), pair.internal.address, `${network} change ${index}`);
    }
  }
});

test('a key that does not fit the account is refused', () => {
  assert.throws(() => parseAccountXpubAnswer(ECDSA_TEST, 'xna-test'), /ecdsa account for a legacy address/);
  assert.throws(() => parseAccountXpubAnswer(LEGACY_MAIN, 'xna-test'), /m\/44'\/1900'\/0'; this account is m\/44'\/1'\/0'/);
  assert.throws(() => parseAccountXpubAnswer({ ...LEGACY_TEST, path: "m/44'/1900'/0'" }, 'xna'), /other chain/);
  assert.throws(() => parseAccountXpubAnswer({ xpub: 1 }, 'xna-test'), /malformed/);
  assert.throws(() => parseAccountXpubAnswer({ ...ECDSA_TEST, addressType: 'pq' }, 'xna-pq-test'), /malformed/);
});

test('discovery follows each branch until the gap limit', async () => {
  const derive = deriverFor(ECDSA_TEST, 'xna-ecdsa-test');
  const used = new Set([derive(0, 0), derive(0, 1), derive(0, 25), derive(1, 0), derive(1, 4)]);
  const calls = [];
  const result = await discoverAddresses(derive, async (batch) => {
    calls.push(batch.length);
    return new Set(batch.filter((a) => used.has(a)));
  });
  assert.deepEqual(result.receive, [derive(0, 0), derive(0, 1), derive(0, 25)]);
  assert.deepEqual(result.change, [derive(1, 0), derive(1, 4)]);
  // Receive: 0-19 (last used 1), 20-39 (finds 25), 40-59 ends the gap; change: 0-19, 20-39.
  assert.equal(calls.length, 5);
  assert.ok(result.derived.has(derive(0, 45)));
  assert.equal(GAP_LIMIT, 20);
});

test('an account without the key watches only its session address', () => {
  const plain = { address: 'tAAA', walletType: 'connect' };
  assert.deepEqual(walletAddressSet(plain), ['tAAA']);
  assert.equal(watchesConnectAccount(plain), false);
  const whole = { ...plain, connectXpub: LEGACY_TEST, connectAddresses: { receive: ['tAAA', 'tBBB'], change: ['tCCC'], scannedAt: 1 } };
  assert.deepEqual(walletAddressSet(whole), ['tAAA', 'tBBB', 'tCCC']);
  assert.equal(watchesConnectAccount(whole), true);
  assert.deepEqual(walletAddressSet({ address: 'tSW', walletType: 'software', connectAddresses: { receive: ['x'], change: [] } }), ['tSW']);
});
