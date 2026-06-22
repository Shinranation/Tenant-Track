import {
  mapMonthlyNoteRowsToState,
  parseMonthlyNoteKey,
} from '../functions/notes.js';

export async function fetchMonthlyNotesForYear(supabaseClient, year) {
  const { data, error } = await supabaseClient
    .from('monthly_notes')
    .select('scope, target_id, billing_month, billing_year, note')
    .eq('billing_year', year);

  return {
    error,
    notes: error ? {} : mapMonthlyNoteRowsToState(data ?? []),
  };
}

export async function saveMonthlyNote(supabaseClient, noteKey, note) {
  const parsedKey = parseMonthlyNoteKey(noteKey);

  if (!parsedKey) {
    return {
      error: new Error('Invalid monthly note key.'),
    };
  }

  return supabaseClient.from('monthly_notes').upsert(
    {
      scope: parsedKey.scope,
      target_id: parsedKey.targetId,
      billing_month: parsedKey.billingMonth,
      billing_year: parsedKey.billingYear,
      note,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'scope,target_id,billing_month,billing_year',
    },
  );
}
