// La ventana de confirmación mientras se prepara la transacción.
//
// Estos tests existen por un fallo publicado: al pintar el contenido real se
// salía del estado de «preparación», y el cierre estaba condicionado a estar
// en ese estado. Resultado: Cancel dejaba de cerrar la ventana y, como sí
// ponía la transacción pendiente a null, el siguiente clic en Broadcast salía
// por su `if (!pending) return` y también parecía muerto. Un fallo, dos
// botones aparentemente rotos.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createConfirmPreparing,
  PREPARING_SUBTITLE,
  READY_SUBTITLE
} from '../src/popup/expanded/confirm-preparing.ts';

/** Host que apunta el estado en el que va quedando la ventana. */
function fakeHost() {
  const state = {
    title: '', subtitle: '', status: '',
    progressVisible: false, preparing: false,
    broadcastEnabled: true, modalVisible: false,
    ghostRows: 0, calls: []
  };
  return {
    state,
    showGhosts(n) { state.ghostRows = n; state.calls.push('showGhosts'); },
    setTitle(t) { state.title = t; },
    setSubtitle(t) { state.subtitle = t; },
    setStatus(t) { state.status = t; },
    toggleProgress(v) { state.progressVisible = v; },
    togglePreparing(v) { state.preparing = v; },
    setBroadcastEnabled(v) { state.broadcastEnabled = v; },
    setModalVisible(v) { state.modalVisible = v; state.calls.push(`modal:${v}`); }
  };
}

test('open deja la ventana abierta, en preparación y sin poder difundir', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const token = c.open('Confirm Asset Transaction', 4);

  assert.equal(host.state.modalVisible, true);
  assert.equal(host.state.preparing, true);
  assert.equal(host.state.progressVisible, true);
  assert.equal(host.state.broadcastEnabled, false);
  assert.equal(host.state.ghostRows, 4);
  assert.equal(host.state.title, 'Confirm Asset Transaction');
  assert.equal(host.state.subtitle, PREPARING_SUBTITLE);
  assert.equal(c.isCurrent(token), true);
  assert.equal(c.isPreparing(), true);
});

test('settle sale de la preparación pero NO cierra la ventana', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.settle();

  assert.equal(host.state.modalVisible, true, 'la ventana con el contenido real sigue abierta');
  assert.equal(host.state.preparing, false);
  assert.equal(host.state.progressVisible, false);
  assert.equal(host.state.subtitle, READY_SUBTITLE);
  assert.equal(c.isPreparing(), false);
});

test('LA REGRESIÓN: close cierra también después de settle', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.settle();          // llegó la transacción, se pintó
  c.close();           // el usuario pulsa Cancel

  assert.equal(host.state.modalVisible, false,
    'Cancel debe cerrar la ventana con el contenido ya pintado');
});

test('close cierra también mientras se prepara', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.close();

  assert.equal(host.state.modalVisible, false);
  assert.equal(host.state.preparing, false);
});

test('closeIfPreparing no toca una ventana ya asentada', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.settle();
  host.state.calls.length = 0;
  c.closeIfPreparing();

  assert.equal(host.state.modalVisible, true, 'no debe cerrar lo que ya no prepara');
  assert.deepEqual(host.state.calls, [], 'ni tocar la ventana en absoluto');
});

test('closeIfPreparing sí cierra si el fallo llega durante la preparación', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.closeIfPreparing();

  assert.equal(host.state.modalVisible, false);
});

test('cancelar durante la preparación invalida su testigo', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const token = c.open('t');
  c.close();                       // Cancel mientras se construía

  assert.equal(c.isCurrent(token), false,
    'el trabajo en vuelo no debe volver a abrir nada al terminar');
});

test('una segunda preparación desbanca a la primera', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const first = c.open('t');
  const second = c.open('t');

  assert.equal(c.isCurrent(first), false);
  assert.equal(c.isCurrent(second), true);
});

test('setProgress ignora un testigo ya caducado', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const stale = c.open('t');
  c.open('t');
  c.setProgress(stale, 'de una operación anterior');

  assert.notEqual(host.state.status, 'de una operación anterior');
});

test('abandon olvida la preparación sin tocar la ventana', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const token = c.open('t');
  host.state.calls.length = 0;
  c.abandon();

  assert.equal(c.isCurrent(token), false);
  assert.equal(c.isPreparing(), false);
  assert.deepEqual(host.state.calls, []);
});
