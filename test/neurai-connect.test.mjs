// Accounts held by NeuraiWallet over Neurai Connect.
//
// The extension stores only the address the phone shares and the session; the
// label it gives the account decides the chain the extension reads, so an
// address of the other chain, or one the extension cannot represent, must not
// become an account.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './load-bundles.mjs';
import {
  NEURAI_CHAIN_MAINNET,
  NEURAI_CHAIN_TESTNET,
  NEURAI_METHODS
} from '@neuraiproject/neurai-connect-core';
import { DAPP_SESSIONS_STORAGE_KEY } from '@neuraiproject/neurai-connect';
import {
  CONNECT_CHAINS,
  CONNECT_METHODS,
  CONNECT_SESSIONS_KEY,
  chainKindOf,
  connectChainFor,
  networkForConnectAddress,
  sessionAddresses,
  signMessageParams,
  describeConnectError,
  CONNECT_OPTIONAL_METHODS,
  connectProposalNamespaces,
  connectSignsTransactions,
  sessionMethods,
  signPsbtParams,
  sameTransaction
} from '../src/shared/neurai-connect.ts';

const T = CONNECT_CHAINS.testnet;
const M = CONNECT_CHAINS.mainnet;
const ADDR = {
  legacyTest: 'tDjYjjNMUiEfSKxSWB5RhgNqFWHCzdGtf3',
  legacyMain: 'NLhdtwjgrcEkRqjJZkRY4sjhkJ93EytLeE',
  ecdsaTest: 'tnq1rpqlhk9qucn28drzp33ugu2unxqf7y7qq887ll2q644739m49ph0sluj0re',
  pqTest: 'tpq1zxu7utdtg4xxghu793rrpxd0whwfns2kaekgadnvk2l63f789a8ysrcg5fq',
  authscriptTest: 'tnc1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsjrz24f',
  obsoleteTest: 'tnq1pw933xtnhdzm4mmgw2agnk06nfuy5lddap3xr9zcmxfc06h5c3kxsqhmkut'
};

test('chain identifiers and storage key match the SDK the bundle is built from', () => {
  assert.equal(CONNECT_CHAINS.mainnet, NEURAI_CHAIN_MAINNET);
  assert.equal(CONNECT_CHAINS.testnet, NEURAI_CHAIN_TESTNET);
  assert.equal(CONNECT_SESSIONS_KEY, DAPP_SESSIONS_STORAGE_KEY);
  assert.equal(connectChainFor('testnet'), T);
  assert.equal(chainKindOf(M), 'mainnet');
  assert.equal(chainKindOf('bip122:0000009697907b2aa409d4b1f10da0fa'), null, 'the testnet before the reset');
});

test('the extension needs messages and asks for transactions as optional', () => {
  assert.deepEqual([...CONNECT_METHODS], ['getAccountAddresses', 'signMessage']);
  assert.deepEqual([...CONNECT_OPTIONAL_METHODS], ['signPsbt', 'neurai_getAccountXpub']);
  for (const method of [...CONNECT_METHODS, 'signPsbt']) assert.ok(NEURAI_METHODS.includes(method), method);
  const proposal = connectProposalNamespaces(T);
  assert.deepEqual(proposal.requiredNamespaces.bip122.chains, [T]);
  assert.deepEqual(proposal.requiredNamespaces.bip122.methods, ['getAccountAddresses', 'signMessage']);
  assert.deepEqual(proposal.optionalNamespaces.bip122, { chains: [T], methods: ['signPsbt', 'neurai_getAccountXpub'], events: [] });
});

test('transactions are on when the session settled signPsbt, for secp256k1 families only', () => {
  const base = { walletType: 'connect', connectMethods: ['getAccountAddresses', 'signMessage', 'signPsbt'] };
  assert.equal(connectSignsTransactions({ ...base, network: 'xna-test' }), true);
  assert.equal(connectSignsTransactions({ ...base, network: 'xna-ecdsa-test' }), true);
  assert.equal(connectSignsTransactions({ ...base, network: 'xna' }), true);
  assert.equal(connectSignsTransactions({ ...base, network: 'xna-pq-test' }), false, 'a PSBT carries no ML-DSA signature');
  assert.equal(connectSignsTransactions({ ...base, network: 'xna-test', connectMethods: ['signMessage'] }), false);
  assert.equal(connectSignsTransactions({ ...base, network: 'xna-test', connectMethods: null }), false);
  assert.equal(connectSignsTransactions({ ...base, network: 'xna-test', walletType: 'software' }), false);
  assert.equal(connectSignsTransactions(null), false);
  assert.deepEqual(sessionMethods({ namespaces: { bip122: { methods: ['signPsbt'] } } }), ['signPsbt']);
  assert.deepEqual(sessionMethods({}), []);
});

test('signPsbt params follow the bip122 profile', () => {
  const change = 'tPXGaMRNwZuV1UKSrD9gABPscrJWUmedQ9';
  assert.deepEqual(signPsbtParams(T, ADDR.legacyTest, 'cHNidP8=', [{ index: 0, address: ADDR.legacyTest }, { index: 2, address: change }]), {
    account: `${T}:${ADDR.legacyTest}`,
    psbt: 'cHNidP8=',
    signInputs: [
      { address: ADDR.legacyTest, index: 0, sighashTypes: [1] },
      { address: change, index: 2, sighashTypes: [1] }
    ],
    broadcast: false
  });
});

test('a signed transaction is the same one when only unlocking data changed', () => {
  const unsigned = '02000000' + '01' + '11'.repeat(32) + '00000000' + '00' + 'ffffffff' + '01' + 'a086010000000000' + '19' + '76a914' + '33'.repeat(20) + '88ac' + '00000000';
  const signed = '02000000' + '01' + '11'.repeat(32) + '00000000' + '02' + 'abcd' + 'ffffffff' + '01' + 'a086010000000000' + '19' + '76a914' + '33'.repeat(20) + '88ac' + '00000000';
  const otherValue = signed.replace('a086010000000000', 'a186010000000000');
  assert.equal(sameTransaction(unsigned, signed), true);
  assert.equal(sameTransaction(unsigned, otherValue), false);
  assert.equal(sameTransaction(unsigned, 'zz'), false);
});

test('version, locktime and reference inputs are part of the transaction', () => {
  const body = '01' + '11'.repeat(32) + '00000000' + '00' + 'ffffffff' + '01' + 'a086010000000000' + '19' + '76a914' + '33'.repeat(20) + '88ac';
  const signedBody = body.replace('00000000' + '00' + 'ffffffff', '00000000' + '02' + 'abcd' + 'ffffffff');
  const ref = (id) => '01' + id.repeat(32) + '00000000';
  const v3 = (inputs, vrefin, locktime = '00000000') => '03000000' + inputs + vrefin + locktime;
  assert.equal(sameTransaction(v3(body, ref('55')), v3(signedBody, ref('55'))), true);
  assert.equal(sameTransaction(v3(body, ref('55')), v3(signedBody, ref('66'))), false);
  assert.equal(sameTransaction(v3(body, ref('55')), v3(signedBody, '00')), false);
  assert.equal(sameTransaction(v3(body, ref('55')), v3(signedBody, ref('55'), '01000000')), false);
  assert.equal(sameTransaction('02000000' + body + '00000000', '01000000' + signedBody + '00000000'), false);
});

test('each address family gets its account label', () => {
  assert.equal(networkForConnectAddress(ADDR.legacyTest, T), 'xna-test');
  assert.equal(networkForConnectAddress(ADDR.ecdsaTest, T), 'xna-ecdsa-test');
  assert.equal(networkForConnectAddress(ADDR.pqTest, T), 'xna-pq-test');
  assert.equal(networkForConnectAddress(ADDR.authscriptTest, T), 'xna-pq-test');
  assert.equal(networkForConnectAddress(ADDR.legacyMain, M), 'xna');
});

test('addresses of the other chain, or not representable, are refused', () => {
  assert.equal(networkForConnectAddress(ADDR.legacyTest, M), null);
  assert.equal(networkForConnectAddress(ADDR.legacyMain, T), null);
  assert.equal(networkForConnectAddress(ADDR.obsoleteTest, T), null);
  assert.equal(networkForConnectAddress('garbage', T), null);
  assert.equal(networkForConnectAddress(ADDR.legacyTest, 'bip122:ffff'), null);
});

test('session addresses: wallet order first, then CAIP-10 accounts, each once, this chain only', () => {
  const session = {
    namespaces: {
      bip122: {
        accounts: [`${T}:${ADDR.legacyTest}`, `${T}:${ADDR.ecdsaTest}`, `${M}:${ADDR.legacyMain}`, `${T}:${ADDR.obsoleteTest}`]
      }
    },
    sessionProperties: {
      bip122_getAccountAddresses: JSON.stringify([
        { address: ADDR.pqTest, publicKey: 'ab', path: "m_pq/100'/1'/0'/0'/0'" },
        { address: ADDR.legacyTest, publicKey: '02cd' }
      ])
    }
  };
  assert.deepEqual(sessionAddresses(session, T), [
    { address: ADDR.pqTest, publicKey: 'ab', path: "m_pq/100'/1'/0'/0'/0'" },
    { address: ADDR.legacyTest, publicKey: '02cd' },
    { address: ADDR.ecdsaTest }
  ]);
  assert.deepEqual(sessionAddresses(session, M), [{ address: ADDR.legacyMain }]);
});

test('a malformed address property does not hide the namespace accounts', () => {
  const session = {
    namespaces: { bip122: { accounts: [`${T}:${ADDR.legacyTest}`] } },
    sessionProperties: { bip122_getAccountAddresses: '{not json' }
  };
  assert.deepEqual(sessionAddresses(session, T), [{ address: ADDR.legacyTest }]);
  assert.deepEqual(sessionAddresses({}, T), []);
});

test('signMessage params carry the CAIP-10 account and the plain address', () => {
  assert.deepEqual(signMessageParams(T, ADDR.legacyTest, 'hi'), {
    account: `${T}:${ADDR.legacyTest}`, address: ADDR.legacyTest, message: 'hi'
  });
});

test('failures are explained in words', () => {
  assert.match(describeConnectError({ code: 4001, message: 'User rejected' }), /rejected in NeuraiWallet/);
  assert.match(describeConnectError({ code: 4200, message: 'x' }), /does not support/);
  assert.match(describeConnectError(new Error('session abc expired')), /session .* has ended/);
  assert.match(describeConnectError(new Error('unknown session abc')), /Scan the QR code again/);
  assert.match(describeConnectError(new Error('request timed out')), /did not answer in time/);
  assert.equal(describeConnectError(new Error('boom')), 'boom');
});
