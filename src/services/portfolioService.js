export async function fetchPortfolioRecords(supabaseClient) {
  const [
    buildingsResult,
    roomsResult,
    tenantsResult,
    contractsResult,
    rentPaymentsResult,
    utilityPaymentsResult,
  ] = await Promise.all([
    supabaseClient.from('buildings').select('id, name, address').order('created_at'),
    supabaseClient
      .from('rooms')
      .select('id, building_id, room_name, monthly_rent, status')
      .order('created_at'),
    supabaseClient.from('tenants').select('id, full_name'),
    supabaseClient
      .from('lease_contracts')
      .select('id, tenant_id, room_id, start_date, end_date, due_day, status, tenants(full_name)'),
    supabaseClient
      .from('rent_payments')
      .select(
        'id, contract_id, billing_month, billing_year, amount_due, amount_paid, due_date, status',
      ),
    supabaseClient
      .from('utility_payments')
      .select(
        'id, contract_id, utility_type, billing_month, billing_year, amount_due, amount_paid, due_date, status',
      ),
  ]);

  const error =
    buildingsResult.error ||
    roomsResult.error ||
    tenantsResult.error ||
    contractsResult.error ||
    rentPaymentsResult.error ||
    utilityPaymentsResult.error;

  return {
    error,
    records: {
      buildings: buildingsResult.data ?? [],
      rooms: roomsResult.data ?? [],
      tenants: tenantsResult.data ?? [],
      contracts: contractsResult.data ?? [],
      rentPayments: rentPaymentsResult.data ?? [],
      utilityPayments: utilityPaymentsResult.data ?? [],
    },
  };
}
