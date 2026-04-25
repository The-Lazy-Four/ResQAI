import { supabase } from '../supabaseClient.js';

// ---- Google OAuth Login ----
// Redirects the user to Google sign-in via Supabase
export async function loginWithGoogle(redirectUrl) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return;
  }

  // Save the page the user was on so we can redirect back after Google login
  const returnTo = redirectUrl || window.location.href;
  localStorage.setItem('resqai_auth_redirect', returnTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin  // Supabase redirects to root
    }
  });

  if (error) {
    console.error('Google login error:', error.message);
  }
}

// ---- Get Current User ----
// Returns the logged-in user object, or null if not authenticated
export async function getCurrentUser() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.warn('Get user error:', error.message);
    return null;
  }

  return data.user;
}

// ---- Logout ----
// Signs the user out of Supabase
export async function logout() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout error:', error.message);
  }
}