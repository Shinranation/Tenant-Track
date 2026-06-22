import { normalizePaymentStatus } from '../functions/paymentStatus.js';

function buildPaymentRequest({ supabaseClient, room, formData, pendingPaymentPurges, paymentKey }) {
  const paymentConfig = {
    rent: {
      table: 'rent_payments',
      paymentId: room.rentPaymentId,
      amount: formData.rentAmount,
      paid: formData.rentPaid,
      dueDate: formData.rentDueDate,
      status: formData.rentStatus,
      createPayload: {},
      onConflict: 'contract_id,billing_month,billing_year',
    },
    water: {
      table: 'utility_payments',
      paymentId: room.waterPaymentId,
      amount: formData.waterAmount,
      paid: formData.waterPaid,
      dueDate: formData.waterDueDate,
      status: formData.waterStatus,
      createPayload: { utility_type: 'water' },
      onConflict: 'contract_id,utility_type,billing_month,billing_year',
    },
    light: {
      table: 'utility_payments',
      paymentId: room.lightPaymentId,
      amount: formData.lightAmount,
      paid: formData.lightPaid,
      dueDate: formData.lightDueDate,
      status: formData.lightStatus,
      createPayload: { utility_type: 'electricity' },
      onConflict: 'contract_id,utility_type,billing_month,billing_year',
    },
  }[paymentKey];

  if (pendingPaymentPurges[paymentKey] && paymentConfig.paymentId) {
    return supabaseClient.from(paymentConfig.table).delete().eq('id', paymentConfig.paymentId);
  }

  const paymentPayload = {
    amount_due: paymentConfig.amount || null,
    amount_paid: paymentConfig.paid || 0,
    due_date: paymentConfig.dueDate || null,
    status: normalizePaymentStatus(paymentConfig.status),
  };

  if (paymentConfig.paymentId) {
    return supabaseClient
      .from(paymentConfig.table)
      .update(paymentPayload)
      .eq('id', paymentConfig.paymentId);
  }

  if (
    !pendingPaymentPurges[paymentKey] &&
    room.contractId &&
    (paymentConfig.amount || paymentConfig.dueDate)
  ) {
    return supabaseClient.from(paymentConfig.table).upsert(
      {
        contract_id: room.contractId,
        billing_month: room.billingMonth,
        billing_year: room.billingYear,
        ...paymentConfig.createPayload,
        ...paymentPayload,
      },
      { onConflict: paymentConfig.onConflict },
    );
  }

  return null;
}

export async function savePayments({ supabaseClient, room, formData, pendingPaymentPurges, contractId }) {
  const roomWithContract = {
    ...room,
    contractId,
  };
  const requests = ['rent', 'water', 'light']
    .map((paymentKey) =>
      buildPaymentRequest({
        supabaseClient,
        room: roomWithContract,
        formData,
        pendingPaymentPurges,
        paymentKey,
      }),
    )
    .filter(Boolean);

  const results = await Promise.all(requests);

  return results.find((result) => result.error)?.error ?? null;
}
