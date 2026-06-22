import { supabase } from '../../lib/supabaseClient.js';

function AccessDeniedScreen({ email }) {
  return (
    <main className="login-shell">
      <section className="login-window" aria-label="TenantTrack access denied">
        <div className="login-window__tab">Access Denied</div>
        <div className="login-content">
          <p className="login-note">
            This Google account is signed in, but it is not approved for TenantTrack.
          </p>
          {email && <p className="login-message login-message--neutral">{email}</p>}
          <button className="login-button" type="button" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}

export default AccessDeniedScreen;
