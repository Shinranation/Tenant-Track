import { paymentHistoryTable } from '../constants/appConstants.js';

export async function fetchPaymentHistory(supabaseClient, roomId) {
  return supabaseClient
    .from(paymentHistoryTable)
    .select(
      'id, created_at, payment_type, old_amount_paid, new_amount_paid, old_status, new_status, changed_by',
    )
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(8);
}

export async function insertPaymentHistoryRows(supabaseClient, paymentHistoryRows) {
  return supabaseClient.from(paymentHistoryTable).insert(paymentHistoryRows);
}
