export async function saveTenant({ supabaseClient, tenantId, tenantName }) {
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
