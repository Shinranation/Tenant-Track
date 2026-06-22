import {
  moneyFields,
  paymentStatusFallback,
  paymentStatusValues,
  paymentTypes,
} from '../constants/appConstants.js';
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

export function getPaymentStatus(activeContract, payments, utilityType) {
  if (!activeContract) {
    return 'vacant';
  }

  const filteredPayments = utilityType
    ? payments.filter((payment) => payment.utility_type === utilityType)
    : payments;

  return filteredPayments[0]?.status ?? 'upcoming';
}

export function getRoomDisplayPaymentStatus(roomStatus, activeContract, payments, utilityType) {
  if (roomStatus !== 'occupied') {
    return 'vacant';
  }

  return getPaymentStatus(activeContract, payments, utilityType);
}

export function normalizePaymentStatus(status) {
  return paymentStatusValues.has(status) ? status : paymentStatusFallback;
}

export function normalizeConfirmation(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function matchesConfirmation(value, confirmation) {
  return normalizeConfirmation(value) === normalizeConfirmation(confirmation);
}

export function normalizeAmount(value) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

export function parsePaymentAmount(value) {
  if (value == null || String(value).trim() === '') {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

export function isValidPartialAmount(partialAmount, amountDue) {
  const parsedPartialAmount = parsePaymentAmount(partialAmount);
  const requiredAmount = normalizeAmount(amountDue);

  return parsedPartialAmount != null && parsedPartialAmount > 0 && parsedPartialAmount < requiredAmount;
}

export function hasRequiredPaymentAmount(amount) {
  const requiredAmount = parsePaymentAmount(amount);

  return requiredAmount != null && requiredAmount > 0;
}

export function getMoneyChanges(room, formData) {
  return moneyFields
    .map(([label, key]) => {
      const previousAmount = normalizeAmount(room[key]);
      const nextAmount = normalizeAmount(formData[key]);

      return previousAmount === nextAmount
        ? null
        : {
            key,
            label,
            previousAmount,
            nextAmount,
          };
    })
    .filter(Boolean);
}

export function hasPaymentHistoryChange(room, formData, paymentType) {
  const previousPaid = normalizeAmount(room[`${paymentType.key}Paid`]);
  const nextPaid = normalizeAmount(formData[`${paymentType.key}Paid`]);
  const previousStatus = normalizePaymentStatus(
    room[`${paymentType.key}Status`] ?? room.payments[paymentType.key],
  );
  const nextStatus = normalizePaymentStatus(formData[`${paymentType.key}Status`]);

  return previousPaid !== nextPaid || previousStatus !== nextStatus;
}

export function buildPaymentHistoryRows({ room, formData, userEmail, activeContractId }) {
  return paymentTypes
    .filter((paymentType) => hasPaymentHistoryChange(room, formData, paymentType))
    .map((paymentType) => ({
      room_id: room.id,
      contract_id: activeContractId,
      payment_table: paymentType.paymentTable,
      payment_id: room[paymentType.paymentIdKey],
      payment_type: paymentType.key,
      utility_type: paymentType.utilityType ?? null,
      billing_month: room.billingMonth,
      billing_year: room.billingYear,
      old_amount_paid: normalizeAmount(room[`${paymentType.key}Paid`]),
      new_amount_paid: normalizeAmount(formData[`${paymentType.key}Paid`]),
      old_status: normalizePaymentStatus(
        room[`${paymentType.key}Status`] ?? room.payments[paymentType.key],
      ),
      new_status: normalizePaymentStatus(formData[`${paymentType.key}Status`]),
      changed_by: userEmail ?? 'Unknown user',
    }));
}

export function getPaymentTypeLabel(paymentType) {
  return paymentTypes.find((type) => type.key === paymentType)?.label ?? paymentType;
}

export function getPendingPurgeLabels(pendingPaymentPurges) {
  return paymentTypes
    .filter((paymentType) => pendingPaymentPurges[paymentType.key])
    .map((paymentType) => paymentType.label);
}

export function buildUpdateNotice({
  room,
  moneyChanges,
  paymentHistoryRows,
  pendingPaymentPurges,
  didRefresh,
  historySaveFailed,
}) {
  const summary = [];
  const purgeLabels = getPendingPurgeLabels(pendingPaymentPurges);

  if (purgeLabels.length > 0) {
    summary.push(`Purged ${purgeLabels.join(', ')} payment record${purgeLabels.length === 1 ? '' : 's'}.`);
  }

  if (paymentHistoryRows.length > 0) {
    summary.push(
      `Updated ${paymentHistoryRows
        .map((historyRow) => getPaymentTypeLabel(historyRow.payment_type))
        .join(', ')} payment status or paid amount.`,
    );
  }

  if (moneyChanges.length > 0) {
    summary.push(`Changed ${moneyChanges.map((change) => change.label).join(', ')}.`);
  }

  if (summary.length === 0) {
    summary.push('Room details saved.');
  }

  summary.push(
    didRefresh === false
      ? 'Saved, but the dashboard could not refresh automatically.'
      : 'Dashboard updated.',
  );

  if (historySaveFailed) {
    summary.push('Payment history still needs setup.');
  }

  return {
    title: 'Update Saved',
    subtitle: `${room.buildingName} - ${room.number}`,
    summary,
  };
}

export function getPaymentHistoryErrorMessage(error) {
  if (error?.code === '42P01') {
    return 'Payment history table missing. Run payment_history_logs.sql in Supabase.';
  }

  if (
    error?.code === '42501' ||
    error?.message?.toLowerCase().includes('row-level security') ||
    error?.message?.toLowerCase().includes('permission denied')
  ) {
    return 'Payment history access blocked. Run the payment_history_logs.sql policies in Supabase.';
  }

  return 'Payment history setup needed. Run payment_history_logs.sql in Supabase.';
}

export function getPaymentHistorySaveErrorMessage(error) {
  if (error?.code === '42P01') {
    return 'Payment saved, but the history table is missing. Run payment_history_logs.sql in Supabase.';
  }

  if (
    error?.code === '42501' ||
    error?.message?.toLowerCase().includes('row-level security') ||
    error?.message?.toLowerCase().includes('permission denied')
  ) {
    return 'Payment saved, but history access is blocked. Run the payment_history_logs.sql policies in Supabase.';
  }

  return 'Payment saved, but history setup is still needed. Run payment_history_logs.sql in Supabase.';
}

export function getTotalPaid(formData) {
  return ['rentPaid', 'waterPaid', 'lightPaid'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

export function getTotalBalance(formData) {
  const totalDue = ['rentAmount', 'waterAmount', 'lightAmount'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const totalPaid = getTotalPaid(formData);

  return Math.max(totalDue - totalPaid, 0);
}

export function isAmountMissing(amount) {
  return amount == null || String(amount).trim() === '';
}

export function getMissingUtilityAmounts(formData) {
  return [
    ['Water', formData.waterAmount],
    ['Lights', formData.lightAmount],
  ]
    .filter(([, amount]) => isAmountMissing(amount))
    .map(([label]) => label);
}
