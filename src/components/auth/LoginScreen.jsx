import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

function LoginScreen() {
  const [authMessage, setAuthMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleLogin() {
    if (!supabase) {
      setAuthMessage('Add Supabase environment variables before logging in.');
      return;
    }

    setIsSubmitting(true);
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-window" aria-label="TenantTrack login">
        <div className="login-window__tab">TenantTrack Login</div>
        <div className="login-content">
          <p className="login-note">Use your allowed Google account to open TenantTrack.</p>

          {authMessage && <p className="login-message">{authMessage}</p>}

          <button
            className="login-button login-button--google"
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
          >
            <span className="login-google-mark" aria-hidden="true">G</span>
            {isSubmitting ? 'Opening Google...' : 'Login with Google'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;
