import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProperties } from '../src/functions/properties.js';

test('builds dashboard properties with active contract and current payments', () => {
  const properties = buildProperties({
    buildings: [{ id: 'building-1', name: 'Main', address: 'Street' }],
    rooms: [
      {
        id: 'room-1',
        building_id: 'building-1',
        room_name: '101',
        monthly_rent: 1000,
        status: 'occupied',
      },
    ],
    tenants: [{ id: 'tenant-1', full_name: 'Alex Tenant' }],
    contracts: [
      {
        id: 'contract-1',
        tenant_id: 'tenant-1',
        room_id: 'room-1',
        start_date: '2026-01-01',
        end_date: null,
        due_day: 5,
        status: 'active',
      },
    ],
    rentPayments: [
      {
        id: 'rent-1',
        contract_id: 'contract-1',
        billing_month: 6,
        billing_year: 2026,
        amount_due: 1000,
        amount_paid: 500,
        due_date: '2026-06-05',
        status: 'partial',
      },
    ],
    utilityPayments: [],
    billingPeriod: { month: 6, year: 2026 },
  });

  const room = properties[0].rooms[0];

  assert.equal(properties[0].name, 'Main');
  assert.equal(room.tenant, 'Alex Tenant');
  assert.equal(room.rentStatus, 'partial');
  assert.equal(room.payments.rent, 'partial');
});
