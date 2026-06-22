import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMonthlyNoteKey,
  mapMonthlyNoteRowsToState,
  parseMonthlyNoteKey,
} from '../src/functions/notes.js';

test('builds and parses monthly note keys', () => {
  const key = getMonthlyNoteKey('room', 'room-1', {
    month: 6,
    year: 2026,
  });

  assert.equal(key, '2026-06:room:room-1');
  assert.deepEqual(parseMonthlyNoteKey(key), {
    billingMonth: 6,
    billingYear: 2026,
    scope: 'room',
    targetId: 'room-1',
  });
});

test('maps monthly note rows into UI state keys', () => {
  assert.deepEqual(
    mapMonthlyNoteRowsToState([
      {
        scope: 'building',
        target_id: 'building-1',
        billing_month: 5,
        billing_year: 2026,
        note: 'Short lease',
      },
    ]),
    {
      '2026-05:building:building-1': 'Short lease',
    },
  );
});
