import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMissingUtilityAmounts,
  getTotalBalance,
  getTotalPaid,
  hasRequiredPaymentAmount,
  isValidPartialAmount,
  normalizeAmount,
  parsePaymentAmount,
} from '../src/functions/paymentAmounts.js';

test('normalizes and parses payment amounts', () => {
  assert.equal(normalizeAmount('120.50'), 120.5);
  assert.equal(normalizeAmount('not-a-number'), 0);
  assert.equal(parsePaymentAmount(''), null);
  assert.equal(parsePaymentAmount('42'), 42);
});

test('validates required and partial payment amounts', () => {
  assert.equal(hasRequiredPaymentAmount('1'), true);
  assert.equal(hasRequiredPaymentAmount('0'), false);
  assert.equal(isValidPartialAmount('50', '100'), true);
  assert.equal(isValidPartialAmount('100', '100'), false);
  assert.equal(isValidPartialAmount('0', '100'), false);
});

test('calculates paid and balance totals', () => {
  const formData = {
    rentAmount: '1000',
    waterAmount: '100',
    lightAmount: '150',
    rentPaid: '900',
    waterPaid: '100',
    lightPaid: '50',
  };

  assert.equal(getTotalPaid(formData), 1050);
  assert.equal(getTotalBalance(formData), 200);
});

test('reports missing utility amounts', () => {
  assert.deepEqual(
    getMissingUtilityAmounts({
      waterAmount: '',
      lightAmount: '50',
    }),
    ['Water'],
  );
});
