import test from 'node:test';
import assert from 'node:assert/strict';
import { sortRoomsForDisplay } from '../src/functions/rooms.js';

test('sorts occupied rooms before available and unavailable rooms', () => {
  const rooms = [
    { number: '3', status: 'unavailable' },
    { number: '2', status: 'available' },
    { number: '10', status: 'occupied' },
    { number: '1', status: 'occupied' },
  ].sort(sortRoomsForDisplay);

  assert.deepEqual(
    rooms.map((room) => room.number),
    ['1', '10', '2', '3'],
  );
});
