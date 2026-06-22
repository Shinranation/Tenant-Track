import { buildPaymentHistoryRows } from '../functions/paymentHistory.js';
import { saveLeaseContract } from './contractService.js';
import { insertPaymentHistoryRows } from './paymentHistoryService.js';
import { savePayments } from './paymentWriteService.js';
import { saveTenant } from './tenantService.js';

async function updateRoomRecord({ supabaseClient, room, formData }) {
  return supabaseClient
    .from('rooms')
    .update({
      monthly_rent: formData.rentAmount || null,
      status: formData.roomStatus,
    })
    .eq('id', room.id);
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

  const contractResult = await saveLeaseContract({
    supabaseClient,
    room,
    formData,
    tenantId: tenantResult.tenantId,
    tenantName,
  });

  if (contractResult.error) {
    return { error: contractResult.error };
  }

  const roomUpdate = await updateRoomRecord({ supabaseClient, room, formData });

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
