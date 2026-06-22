import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPaymentForBillingPeriod,
  getRecurringAmount,
  getRecurringDueDate,
} from '../src/functions/paymentSchedule.js';

const billingPeriod = {
  month: 2,
  year: 2026,
};

test('finds a payment for the current billing period', () => {
  const payment = getPaymentForBillingPeriod(
    [
      { billing_month: 1, billing_year: 2026, amount_due: 100 },
      { billing_month: 2, billing_year: 2026, amount_due: 200 },
    ],
    billingPeriod,
  );

  assert.equal(payment.amount_due, 200);
});

test('uses current amount before recurring fallback amount', () => {
  assert.equal(
    getRecurringAmount(
      [
        { billing_month: 1, billing_year: 2026, amount_due: 100 },
        { billing_month: 2, billing_year: 2026, amount_due: 200 },
      ],
      billingPeriod,
    ),
    200,
  );
});

test('clamps recurring due dates to the days in the selected month', () => {
  assert.equal(
    getRecurringDueDate(
      [{ billing_month: 1, billing_year: 2026, due_date: '2026-01-31' }],
      billingPeriod,
    ),
    '2026-02-28',
  );
});
