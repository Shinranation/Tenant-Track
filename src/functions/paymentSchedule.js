import { getDayFromDate, formatBillingDate } from './date.js';

export function getPaymentForBillingPeriod(payments, billingPeriod) {
  return payments.find(
    (payment) =>
      payment.billing_month === billingPeriod.month && payment.billing_year === billingPeriod.year,
  );
}

export function getRecurringDueDate(payments, billingPeriod, fallbackDay = '') {
  const currentPayment = getPaymentForBillingPeriod(payments, billingPeriod);

  if (currentPayment?.due_date) {
    return currentPayment.due_date;
  }

  const paymentWithDueDate = payments
    .filter((payment) => payment.due_date)
    .sort(
      (left, right) =>
        right.billing_year - left.billing_year || right.billing_month - left.billing_month,
    )[0];
  const recurringDay = getDayFromDate(paymentWithDueDate?.due_date) || fallbackDay;

  return formatBillingDate(billingPeriod, recurringDay);
}

export function getRecurringAmount(payments, billingPeriod) {
  const currentPayment = getPaymentForBillingPeriod(payments, billingPeriod);

  if (currentPayment?.amount_due != null) {
    return currentPayment.amount_due;
  }

  const paymentWithAmount = payments
    .filter((payment) => payment.amount_due != null)
    .sort(
      (left, right) =>
        right.billing_year - left.billing_year || right.billing_month - left.billing_month,
    )[0];

  return paymentWithAmount?.amount_due ?? '';
}
