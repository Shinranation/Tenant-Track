export function getRoomDisplayOrder(room) {
  if (room.status === 'occupied') {
    return 0;
  }

  if (room.status === 'available') {
    return 1;
  }

  if (room.status === 'unavailable') {
    return 2;
  }

  if (room.tenant || room.contractId) {
    return 0;
  }

  return 1;
}

export function sortRoomsForDisplay(roomA, roomB) {
  return (
    getRoomDisplayOrder(roomA) - getRoomDisplayOrder(roomB) ||
    roomA.number.localeCompare(roomB.number, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}
