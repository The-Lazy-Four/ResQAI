import { getCurrentUser, logout } from './authService.js';

let currentUser = null;

function getLocalAuthUser() {
    const token = localStorage.getItem('auth-token') || localStorage.getItem('resqai_token');
    if (!token) return null;

    let storedUser = null;
    try {
        storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (error) {
        storedUser = null;
    }

    const name = [
        storedUser?.firstName,
        storedUser?.lastName
    ].filter(Boolean).join(' ') || storedUser?.name || localStorage.getItem('resqai_admin_name') || storedUser?.email || 'Admin';

    return {
        id: storedUser?.userID || storedUser?.id || 'local-admin',
        email: storedUser?.email || '',
        user_metadata: {
            full_name: name,
            avatar_url: storedUser?.avatarUrl || ''
        }
    };
}

async function resolveCurrentUser() {
    const supabaseUser = await getCurrentUser();
    if (supabaseUser) return supabaseUser;
    return getLocalAuthUser();
}

function clearLocalAuth() {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('resqai_token');
    localStorage.removeItem('resqai_admin_name');
    localStorage.removeItem('user');
}

async function init() {
    currentUser = await resolveCurrentUser();

    if (currentUser) {
        console.log('[AUTH] User authenticated:', currentUser.email || currentUser.id);
        updateSidebarProfile(currentUser);
    } else {
        console.log('[AUTH] No active session - create actions will redirect to admin login');
    }
}

export async function requireAuthForCreate() {
    currentUser = await resolveCurrentUser();

    if (currentUser) {
        return true;
    }

    const next = encodeURIComponent(window.location.href);
    window.location.href = `/pages/admin-login.html?next=${next}`;
    return false;
}

export function getAdminId() {
    return currentUser ? currentUser.id : null;
}

export function getUser() {
    return currentUser;
}

function updateSidebarProfile(user) {
    const avatarUrl = user.user_metadata?.avatar_url
        || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.id || user.email || 'resqai')}`;
    const displayName = user.user_metadata?.full_name || user.email || 'ADMIN';

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
            try {
                await fetch('/api/google-auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.warn('Google logout failed:', error);
            }

            await logout();
            clearLocalAuth();
            window.location.reload();
        });
        profileContainer.appendChild(logoutBtn);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
