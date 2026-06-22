import { monthlyNotesStorageKey } from '../constants/appConstants.js';

export function loadMonthlyNotes() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(monthlyNotesStorageKey)) ?? {};
  } catch {
    return {};
  }
}

export function getMonthlyNoteKey(scope, id, billingPeriod) {
  return `${billingPeriod.year}-${String(billingPeriod.month).padStart(2, '0')}:${scope}:${id}`;
}

export function hasNoteValue(value) {
  return value != null && String(value).trim() !== '';
}

export function hasMonthlyRoomNote(notes, billingPeriod, roomId) {
  return hasNoteValue(notes[getMonthlyNoteKey('room', roomId, billingPeriod)]);
}

export function getMonthlyNoteCount(notes, billingPeriod, properties) {
  return properties.reduce((total, property) => {
    const buildingNoteCount = hasNoteValue(
      notes[getMonthlyNoteKey('building', property.id, billingPeriod)],
    )
      ? 1
      : 0;
    const roomNoteCount = property.rooms.filter((room) =>
      hasMonthlyRoomNote(notes, billingPeriod, room.id),
    ).length;

    return total + buildingNoteCount + roomNoteCount;
  }, 0);
}
