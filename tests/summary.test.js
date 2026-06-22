import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSummaryRows,
  groupRowsByBuilding,
} from '../src/functions/summary.js';

test('builds paid income summary rows by billing period', () => {
  const rows = buildSummaryRows(
    {
      buildings: [{ id: 'building-1', name: 'Main', address: 'Street' }],
      rooms: [{ id: 'room-1', building_id: 'building-1', room_name: '101' }],
      tenants: [{ id: 'tenant-1', full_name: 'Alex Tenant' }],
      contracts: [{ id: 'contract-1', tenant_id: 'tenant-1', room_id: 'room-1', status: 'active' }],
      rentPayments: [
        { contract_id: 'contract-1', billing_month: 6, billing_year: 2026, amount_paid: 1000 },
      ],
      utilityPayments: [
        {
          contract_id: 'contract-1',
          utility_type: 'water',
          billing_month: 6,
          billing_year: 2026,
          amount_paid: 100,
        },
      ],
    },
    { month: 6, year: 2026 },
    'month',
    {},
  );

  assert.equal(rows[0].tenantName, 'Alex Tenant');
  assert.equal(rows[0].totalPaid, 1100);
});

test('groups summary rows by building and totals payments', () => {
  const groups = groupRowsByBuilding([
    {
      id: 'room-1',
      buildingId: 'building-1',
      buildingName: 'Main',
      buildingAddress: 'Street',
      rentPaid: 1000,
      waterPaid: 100,
      lightPaid: 50,
      totalPaid: 1150,
    },
  ]);

  assert.equal(groups[0].name, 'Main');
  assert.equal(groups[0].totalPaid, 1150);
});
