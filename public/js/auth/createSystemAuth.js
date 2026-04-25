/**
 * createSystemAuth.js
 * 
 * Auth guard for "Create System" actions on the Custom Builder Dashboard.
 * 
 * Behavior:
 *   - On page load: checks if user is already logged in via Supabase
 *   - If logged in: shows user info in the sidebar, enables direct system creation
 *   - If NOT logged in: "Create New System" triggers Google OAuth login
 *   - After Google redirect returns here, the user is now authenticated
 *     and can proceed with system creation
 */

import { loginWithGoogle, getCurrentUser, logout } from './authService.js';

let currentUser = null;

// ---- Check session on load ----
async function init() {
    currentUser = await getCurrentUser();

    if (currentUser) {
        console.log('[AUTH] User authenticated:', currentUser.email);
        updateSidebarProfile(currentUser);
    } else {
        console.log('[AUTH] No active session — create actions will require Google login');
    }
}

// ---- Gate: require login before creating a system ----
// Call this before navigating to org-select. Returns true if user is logged in.
export async function requireAuthForCreate() {
    // Re-check in case session changed
    currentUser = await getCurrentUser();

    if (currentUser) {
        return true; // user is authenticated, proceed
    }

    // Not logged in — trigger Google OAuth (will redirect back here after login)
    await loginWithGoogle(window.location.href);
    return false; // navigation will not continue (page redirects to Google)
}

// ---- Get the authenticated admin ID (for attaching to created systems) ----
export function getAdminId() {
    return currentUser ? currentUser.id : null;
}

// ---- Get current user info ----
export function getUser() {
    return currentUser;
}

// ---- Update sidebar profile with real user data ----
function updateSidebarProfile(user) {
    const avatarUrl = user.user_metadata?.avatar_url
        || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id;
    const displayName = user.user_metadata?.full_name || user.email;

    // Update the sidebar profile section (if it exists on this page)
    const profileImg = document.querySelector('aside img[alt="User Operational Profile"]');
    if (profileImg) {
        profileImg.src = avatarUrl;
        profileImg.alt = displayName;
    }

    const nameEl = document.querySelector('aside .text-\\[\\#ffb3ae\\].font-black.text-sm');
    if (nameEl) {
        nameEl.textContent = displayName.split(' ')[0].toUpperCase();
    }

    const levelEl = document.querySelector('aside .text-slate-500.text-\\[10px\\]');
    if (levelEl) {
        levelEl.textContent = 'ADMIN ACCESS';
    }

    // Add a logout option below the profile
    const profileContainer = document.querySelector('aside .px-6.mb-10');
    if (profileContainer && !document.getElementById('resqai-logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'resqai-logout-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.cssText = `
            margin-top: 12px;
            background: none;
            border: 1px solid rgba(255, 83, 82, 0.3);
            color: rgba(255, 83, 82, 0.8);
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 11px;
            font-family: 'Space Grotesk', sans-serif;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
        `;
        logoutBtn.addEventListener('mouseenter', () => {
            logoutBtn.style.background = 'rgba(255, 83, 82, 0.1)';
            logoutBtn.style.color = '#ff5352';
        });
        logoutBtn.addEventListener('mouseleave', () => {
            logoutBtn.style.background = 'none';
            logoutBtn.style.color = 'rgba(255, 83, 82, 0.8)';
        });
        logoutBtn.addEventListener('click', async () => {
            await logout();
            window.location.reload();
        });
        profileContainer.appendChild(logoutBtn);
    }
}

// ---- Auto-init when DOM is ready ----
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
