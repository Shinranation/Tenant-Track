export async function findAllowedUserByEmail(supabaseClient, email) {
  return supabaseClient
    .from('allowed_users')
    .select('email')
    .ilike('email', email)
    .maybeSingle();
}
