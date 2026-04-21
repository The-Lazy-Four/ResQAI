/**
 * ECHO+ Inline Helpers
 * Functions from inline scripts, now in external module
 */

/**
 * Speak directional guidance
 */
function speakDirectional(text) {
    if (!text || typeof text !== 'string') return;

    try {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.9;
        utt.pitch = 1.1;
        utt.volume = 1;
        utt.lang = 'en-US';

        window.speechSynthesis.speak(utt);
    } catch (error) {
        console.error('Speech synthesis error:', error);
    }
}

/**
 * Toggle zone lock state
 */
function toggleZone(btn) {
    if (!btn || !(btn instanceof HTMLElement)) return false;

    const isLocked = btn.textContent === 'Locked';
    btn.textContent = isLocked ? 'Unlocked' : 'Locked';
    btn.style.background = isLocked ? 'var(--medical-dim)' : 'var(--fire-dim)';
    btn.style.color = isLocked ? 'var(--medical)' : 'var(--fire)';
    btn.style.borderColor = isLocked ? 'rgba(0,217,126,0.3)' : 'rgba(255,77,77,0.3)';

    return true;
}

/**
 * Initialize admin UI on page load
 */
function initAdminStatus() {
    try {
        const st = document.getElementById('admin-status-text');
        if (st) {
            st.style.color = 'var(--medical)';
            st.textContent = 'OPERATIONAL';
        }
    } catch (error) {
        console.error('Admin status initialization error:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdminStatus);
