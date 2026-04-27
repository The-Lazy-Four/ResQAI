// ---- Local Account Login ----
// Injects a premium modal to create an account and stores data locally
export async function loginWithGoogle(redirectUrl) {
  return new Promise((resolve) => {
    // Check if modal already exists
    if (document.getElementById('resqai-auth-modal')) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'resqai-auth-modal';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(10, 14, 20, 0.85); backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease; font-family: 'Space Grotesk', system-ui, sans-serif;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #10141a; border: 1px solid rgba(255, 83, 82, 0.15);
      border-radius: 24px; padding: 40px; width: 100%; max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 83, 82, 0.1);
      position: relative;
    `;

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 83, 82, 0.1); border: 1px solid rgba(255, 83, 82, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span class="material-symbols-outlined" style="color: #ff5352;">fingerprint</span>
        </div>
        <h2 style="color: #fff; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Operator Authentication</h2>
        <p style="color: #888; font-size: 14px; margin: 0; font-family: 'Inter', sans-serif;">Enter credentials to access secure systems</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #ffb3ae; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">Email Address</label>
        <input type="email" id="auth-email" placeholder="operator@resqai.org" style="width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px 16px; color: #fff; font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='rgba(255, 83, 82, 0.4)'" onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'">
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #ffb3ae; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">Full Name</label>
        <input type="text" id="auth-name" placeholder="John Doe" style="width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px 16px; color: #fff; font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='rgba(255, 83, 82, 0.4)'" onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'">
      </div>

      <div style="display: flex; gap: 12px;">
        <button id="auth-cancel" style="flex: 1; padding: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;">Cancel</button>
        <button id="auth-submit" style="flex: 2; padding: 14px; border-radius: 12px; background: linear-gradient(to right, #ff5352, #ffb3ae); border: none; color: #68000b; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(255, 83, 82, 0.3);">Authenticate</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add keyframe animation if not exists
    if (!document.getElementById('resqai-auth-styles')) {
      const style = document.createElement('style');
      style.id = 'resqai-auth-styles';
      style.textContent = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
      document.head.appendChild(style);
    }

    // Event listeners
    document.getElementById('auth-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve();
    });

    document.getElementById('auth-submit').addEventListener('click', () => {
      const email = document.getElementById('auth-email').value.trim();
      const name = document.getElementById('auth-name').value.trim();
      
      if (!email) {
        document.getElementById('auth-email').style.borderColor = '#ff5352';
        return;
      }

      const user = {
        id: 'local_' + Date.now(),
        email: email,
        user_metadata: {
          full_name: name || 'Local Operator',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email
        }
      };
      
      localStorage.setItem('resqai_local_user', JSON.stringify(user));
      document.body.removeChild(overlay);
      
      const returnTo = redirectUrl || window.location.href;
      window.location.href = returnTo;
      resolve();
    });
  });
}

// ---- Get Current User ----
// Returns the logged-in user object, or null if not authenticated
export async function getCurrentUser() {
  const data = localStorage.getItem('resqai_local_user');
  if (data) {
    return JSON.parse(data);
  }
  return null;
}

// ---- Logout ----
// Signs the user out of the local session
export async function logout() {
  localStorage.removeItem('resqai_local_user');
}