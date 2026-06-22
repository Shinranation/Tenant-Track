import { getDayFromDate } from '../functions/date.js';
import { buildPaymentHistoryRows, normalizePaymentStatus } from '../functions/payments.js';
import { insertPaymentHistoryRows } from './paymentHistoryService.js';

async function saveTenant({ supabaseClient, tenantId, tenantName }) {
  if (tenantId && tenantName) {
    const tenantUpdate = await supabaseClient
      .from('tenants')
      .update({ full_name: tenantName })
      .eq('id', tenantId);

    return { tenantId, error: tenantUpdate.error };
  }

  if (!tenantId && tenantName) {
    const tenantInsert = await supabaseClient
      .from('tenants')
      .insert({ full_name: tenantName })
      .select('id')
      .single();

    return {
      tenantId: tenantInsert.data?.id,
      error: tenantInsert.error,
    };
  }

  return { tenantId, error: null };
}

async function saveContract({ supabaseClient, room, formData, tenantId, tenantName }) {
  if (room.contractId) {
    const contractUpdate = await supabaseClient
      .from('lease_contracts')
      .update({
        start_date: formData.movedIn || null,
        end_date: formData.contractEnds || null,
        due_day: getDayFromDate(formData.rentDueDate) || null,
        status: tenantName ? 'active' : 'ended',
      })
      .eq('id', room.contractId);

    return {
      contractId: tenantName ? room.contractId : null,
      error: contractUpdate.error,
    };
  }

  if (tenantId) {
    const contractInsert = await supabaseClient
      .from('lease_contracts')
      .insert({
        tenant_id: tenantId,
        room_id: room.id,
        start_date: formData.movedIn || null,
        end_date: formData.contractEnds || null,
        due_day: getDayFromDate(formData.rentDueDate) || null,
        status: 'active',
      })
      .select('id')
      .single();

    return {
      contractId: contractInsert.data?.id,
      error: contractInsert.error,
    };
  }

  return { contractId: null, error: null };
}

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

async function savePayments({ supabaseClient, room, formData, pendingPaymentPurges, contractId }) {
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

export async function saveRoomChanges({
  supabaseClient,
  room,
  formData,
  pendingPaymentPurges,
  userEmail,
}) {
  const tenantName = formData.tenant.trim();
  const tenantResult = await saveTenant({
    supabaseClient,
    tenantId: room.tenantId,
    tenantName,
  });

  if (tenantResult.error) {
    return { error: tenantResult.error };
  }

  const contractResult = await saveContract({
    supabaseClient,
    room,
    formData,
    tenantId: tenantResult.tenantId,
    tenantName,
  });

  if (contractResult.error) {
    return { error: contractResult.error };
  }

  const roomUpdate = await supabaseClient
    .from('rooms')
    .update({
      monthly_rent: formData.rentAmount || null,
      status: formData.roomStatus,
    })
    .eq('id', room.id);

  if (roomUpdate.error) {
    return { error: roomUpdate.error };
  }

  const paymentHistoryRows = buildPaymentHistoryRows({
    room,
    formData,
    userEmail,
    activeContractId: contractResult.contractId,
  });
  const paymentError = await savePayments({
    supabaseClient,
    room,
    formData,
    pendingPaymentPurges,
    contractId: contractResult.contractId,
  });

  if (paymentError) {
    return { error: paymentError };
  }

  if (paymentHistoryRows.length === 0) {
    return {
      error: null,
      historyError: null,
      paymentHistoryRows,
    };
  }

  const { error: historyError } = await insertPaymentHistoryRows(
    supabaseClient,
    paymentHistoryRows,
  );

  return {
    error: null,
    historyError,
    paymentHistoryRows,
  };
}
