// The confirm modal while a transaction is being prepared.
//
// These tests exist because of a shipped bug: painting the real content left
// the "preparing" state, and closing was conditional on being in that state.
// Result: Cancel stopped closing the modal and, since it did set the pending
// transaction to null, the next click on Broadcast fell out of its
// `if (!pending) return` and looked dead too. One bug, two apparently broken
// buttons.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createConfirmPreparing,
  PREPARING_SUBTITLE,
  READY_SUBTITLE
} from '../src/popup/expanded/confirm-preparing.ts';

/** Host that records the state the modal ends up in. */
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

test('open leaves the modal open, preparing and unable to broadcast', () => {
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

test('settle leaves the preparing state but does NOT close the modal', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.settle();

  assert.equal(host.state.modalVisible, true, 'the modal with the real content stays open');
  assert.equal(host.state.preparing, false);
  assert.equal(host.state.progressVisible, false);
  assert.equal(host.state.subtitle, READY_SUBTITLE);
  assert.equal(c.isPreparing(), false);
});

test('THE REGRESSION: close also closes after settle', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.settle();          // the transaction arrived and was painted
  c.close();           // the user presses Cancel

  assert.equal(host.state.modalVisible, false,
    'Cancel must close the modal once the content is painted');
});

test('close also closes while preparing', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.close();

  assert.equal(host.state.modalVisible, false);
  assert.equal(host.state.preparing, false);
});

test('closeIfPreparing does not touch an already settled modal', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.settle();
  host.state.calls.length = 0;
  c.closeIfPreparing();

  assert.equal(host.state.modalVisible, true, 'must not close what is no longer preparing');
  assert.deepEqual(host.state.calls, [], 'nor touch the modal at all');
});

test('closeIfPreparing does close when the failure lands while preparing', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  c.open('t');
  c.closeIfPreparing();

  assert.equal(host.state.modalVisible, false);
});

test('cancelling while preparing invalidates its token', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const token = c.open('t');
  c.close();                       // Cancel while it was building

  assert.equal(c.isCurrent(token), false,
    'the in-flight work must not reopen anything when it finishes');
});

test('a second preparation supersedes the first', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const first = c.open('t');
  const second = c.open('t');

  assert.equal(c.isCurrent(first), false);
  assert.equal(c.isCurrent(second), true);
});

test('setProgress ignores an expired token', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const stale = c.open('t');
  c.open('t');
  c.setProgress(stale, 'from an earlier operation');

  assert.notEqual(host.state.status, 'from an earlier operation');
});

test('abandon forgets the preparation without touching the modal', () => {
  const host = fakeHost();
  const c = createConfirmPreparing(host);
  const token = c.open('t');
  host.state.calls.length = 0;
  c.abandon();

  assert.equal(c.isCurrent(token), false);
  assert.equal(c.isPreparing(), false);
  assert.deepEqual(host.state.calls, []);
});
