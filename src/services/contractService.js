import { getDayFromDate } from '../functions/date.js';

export async function saveLeaseContract({ supabaseClient, room, formData, tenantId, tenantName }) {
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
