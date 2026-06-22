import { monthOptions } from '../constants/appConstants.js';
import { getMonthlyNoteKey, hasNoteValue } from './notes.js';

export function getTenantName(contract, tenants) {
  const tenant = tenants.find((tenantRecord) => tenantRecord.id === contract?.tenant_id);
  const nestedTenant = Array.isArray(contract?.tenants) ? contract.tenants[0] : contract?.tenants;

  return tenant?.full_name ?? nestedTenant?.full_name ?? '';
}

export function getPaidAmount(payment) {
  const amount = Number(payment?.amount_paid);

  return Number.isFinite(amount) ? amount : 0;
}

export function isPaymentInSummaryPeriod(payment, billingPeriod, summaryPeriod) {
  if (payment.billing_year !== billingPeriod.year) {
    return false;
  }

  return summaryPeriod === 'year' || payment.billing_month === billingPeriod.month;
}

export function getReceiptExportTitle(billingPeriod, summaryPeriod) {
  const periodSlug =
    summaryPeriod === 'year'
      ? billingPeriod.year
      : `${billingPeriod.year}-${String(billingPeriod.month).padStart(2, '0')}`;

  return `TenantTrack Receipt ${periodSlug}`;
}

export function getSummaryNoteText(notes, billingPeriod, summaryPeriod, buildingId, roomId) {
  const monthRange =
    summaryPeriod === 'year'
      ? monthOptions.map((_, index) => index + 1)
      : [billingPeriod.month];

  return monthRange
    .flatMap((month) => {
      const notePeriod = {
        month,
        year: billingPeriod.year,
      };
      const monthLabel = summaryPeriod === 'year' ? `${monthOptions[month - 1].slice(0, 3)}: ` : '';
      const buildingNote = notes[getMonthlyNoteKey('building', buildingId, notePeriod)];
      const roomNote = notes[getMonthlyNoteKey('room', roomId, notePeriod)];

      return [
        hasNoteValue(buildingNote) ? `${monthLabel}Building - ${buildingNote.trim()}` : '',
        hasNoteValue(roomNote) ? `${monthLabel}Room - ${roomNote.trim()}` : '',
      ];
    })
    .filter(Boolean)
    .join('\n');
}

export function buildSummaryRows(portfolioRecords, billingPeriod, summaryPeriod, notes) {
  return portfolioRecords.rooms.map((room) => {
    const building = portfolioRecords.buildings.find(
      (buildingRecord) => buildingRecord.id === room.building_id,
    );
    const roomContracts = portfolioRecords.contracts.filter((contract) => contract.room_id === room.id);
    const contractIds = new Set(roomContracts.map((contract) => contract.id));
    const activeContract = roomContracts.find((contract) => contract.status === 'active');
    const tenantName =
      getTenantName(activeContract, portfolioRecords.tenants) ||
      roomContracts
        .map((contract) => getTenantName(contract, portfolioRecords.tenants))
        .find((name) => name) ||
      'Vacant';
    const rentPaid = portfolioRecords.rentPayments
      .filter(
        (payment) =>
          contractIds.has(payment.contract_id) &&
          isPaymentInSummaryPeriod(payment, billingPeriod, summaryPeriod),
      )
      .reduce((total, payment) => total + getPaidAmount(payment), 0);
    const utilityPayments = portfolioRecords.utilityPayments.filter(
      (payment) =>
        contractIds.has(payment.contract_id) &&
        isPaymentInSummaryPeriod(payment, billingPeriod, summaryPeriod),
    );
    const waterPaid = utilityPayments
      .filter((payment) => payment.utility_type === 'water')
      .reduce((total, payment) => total + getPaidAmount(payment), 0);
    const lightPaid = utilityPayments
      .filter((payment) => payment.utility_type === 'electricity')
      .reduce((total, payment) => total + getPaidAmount(payment), 0);

    return {
      id: room.id,
      buildingId: building?.id ?? 'unassigned',
      buildingName: building?.name ?? 'Unassigned',
      buildingAddress: building?.address ?? '',
      roomName: room.room_name,
      tenantName,
      rentPaid,
      waterPaid,
      lightPaid,
      totalPaid: rentPaid + waterPaid + lightPaid,
      notes: getSummaryNoteText(notes, billingPeriod, summaryPeriod, building?.id, room.id),
    };
  });
}

export function groupRowsByBuilding(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const groupId = row.buildingId ?? row.buildingName;
    const currentGroup = groups.get(groupId) ?? {
      id: groupId,
      name: row.buildingName,
      address: row.buildingAddress,
      rows: [],
      rentPaid: 0,
      waterPaid: 0,
      lightPaid: 0,
      totalPaid: 0,
    };

    currentGroup.rows.push(row);
    currentGroup.rentPaid += row.rentPaid;
    currentGroup.waterPaid += row.waterPaid;
    currentGroup.lightPaid += row.lightPaid;
    currentGroup.totalPaid += row.totalPaid;
    groups.set(groupId, currentGroup);
  });

  return Array.from(groups.values());
}
