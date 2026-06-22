import {
  paymentTypes,
} from '../constants/appConstants.js';
import { normalizeAmount } from './paymentAmounts.js';
import { normalizePaymentStatus } from './paymentStatus.js';

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
