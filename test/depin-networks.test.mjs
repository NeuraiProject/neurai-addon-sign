// En qué redes se ofrece DePIN.
//
// Hasta ahora el formulario ofrecía crear assets DePIN también en mainnet,
// donde el fork no ha ocurrido: la transacción se construía y la cadena la
// rechazaba. La lista es deliberada — el día de la activación en mainnet se
// añade 'xna' aquí y no hay nada más que tocar.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsDepin, DEPIN_NETWORKS } from '../src/popup/expanded/depin-networks.ts';

test('testnet soporta DePIN, en todas sus variantes', () => {
  assert.equal(supportsDepin('xna-test'), true);
  assert.equal(supportsDepin('xna-legacy-test'), true);
  assert.equal(supportsDepin('xna-pq-test'), true);
});

test('mainnet no, ni en su variante PQ', () => {
  assert.equal(supportsDepin('xna'), false);
  assert.equal(supportsDepin('xna-pq'), false);
  assert.equal(supportsDepin('xna-legacy'), false);
});

test('una red desconocida no ofrece DePIN', () => {
  // Esconder de más es preferible a ofrecer una operación que la cadena
  // rechazaría.
  assert.equal(supportsDepin('alguna-red-futura'), false);
});

test('sin red no se ofrece', () => {
  assert.equal(supportsDepin(undefined), false);
  assert.equal(supportsDepin(null), false);
  assert.equal(supportsDepin(''), false);
});

test('la lista no incluye ninguna red de mainnet', () => {
  // Guarda contra añadir 'xna' por error al tocar la lista.
  assert.ok(DEPIN_NETWORKS.every(n => n.endsWith('-test')),
    `alguna red de la lista no es testnet: ${DEPIN_NETWORKS.join(', ')}`);
});
