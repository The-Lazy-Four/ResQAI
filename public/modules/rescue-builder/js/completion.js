// =====================================================
// COMPLETION - System Creation Completion Flow
// Orchestrates: Save → Animate → Load → Render
// =====================================================

import { createSystemAPI } from './api.js';
import { saveSystemToStorage, loadSystemsFromStorage } from './storage.js';
import { loadAndRenderDashboard, renderSystemCards } from './dashboard.js';
import { showScreen, showToast, showSystemsDashboard } from './navigation.js';

const DEBUG = true;

/**
 * Complete the system creation process
 * CRITICAL FLOW:
 * 1. Save to API (or fallback to localStorage)
 * 2. Show progress animation
 * 3. Load systems from API (or fallback to localStorage)
 * 4. Render dashboard with new system visible
 */
export async function completeSystemCreation(systemData) {
    console.group('[COMPLETE] System creation flow starting');
    
    try {
        // ===== STEP 1: SAVE SYSTEM =====
        console.log('[COMPLETE] Step 1: Saving system...');
        
        // Validate required fields
        if (!systemData.organizationName) {
            throw new Error('Organization name required');
        }
        if (!systemData.organizationType) {
            throw new Error('Organization type required');
        }

        // Attempt to save to API
        let savedSystem = null;
        try {
            savedSystem = await createSystemAPI(systemData);
            console.log('[COMPLETE] ✅ System saved to API:', savedSystem.systemID);
        } catch (apiError) {
            console.warn('[COMPLETE] ⚠️ API save failed, using localStorage fallback');
            
            // Fallback: Save locally
            const systemID = 'LOCAL-' + Date.now();
            savedSystem = {
                systemID,
                ...systemData,
                source: 'local',
                createdAt: new Date().toISOString()
            };
            
            const saved = saveSystemToStorage(savedSystem);
            if (!saved) {
                throw new Error('Failed to save to localStorage');
            }
            
            console.log('[COMPLETE] ✅ System saved to localStorage:', systemID);
        }

        if (!savedSystem || !savedSystem.systemID) {
            throw new Error('System save failed - no systemID');
        }

        console.log('[COMPLETE] Step 1: ✅ System saved');

        // ===== STEP 2: SHOW ANIMATION =====
        console.log('[COMPLETE] Step 2: Starting animation...');
        showScreen('screen-ai-build');
        
        const animationResult = await showProgressAnimation();
        if (!animationResult) {
            throw new Error('Animation failed');
        }
        
        console.log('[COMPLETE] Step 2: ✅ Animation complete');

        // ===== STEP 3: LOAD SYSTEMS =====
        console.log('[COMPLETE] Step 3: Loading systems...');
        
        const systems = loadSystemsFromStorage();
        console.log('[COMPLETE] Loaded', systems.length, 'systems from storage');
        
        // Verify our system is in the list
        const ourSystem = systems.find(s => s.systemID === savedSystem.systemID);
        if (!ourSystem) {
            console.warn('[COMPLETE] ⚠️ Our system not in list, adding it');
            systems.push(savedSystem);
            localStorage.setItem('rescue_systems', JSON.stringify(systems));
        }
        
        console.log('[COMPLETE] Step 3: ✅ Systems loaded');

        // ===== STEP 4: RENDER DASHBOARD =====
        console.log('[COMPLETE] Step 4: Rendering dashboard...');
        
        showScreen('screen-systems-dashboard');
        renderSystemCards(systems);
        
        console.log('[COMPLETE] Step 4: ✅ Dashboard rendered');

        // ===== SUCCESS =====
        console.log('[COMPLETE] ✅✅✅ COMPLETION SUCCESSFUL ✅✅✅');
        console.log('[COMPLETE] System ID:', savedSystem.systemID);
        console.log('[COMPLETE] Total systems:', systems.length);
        console.groupEnd();
        
        showToast('✅ Your rescue system is ready!', 'success');
        return savedSystem;

    } catch (error) {
        console.error('[COMPLETE] ❌ COMPLETION FAILED:', error.message);
        console.groupEnd();
        
        showToast(`❌ Error: ${error.message}`, 'error');
        showScreen('screen-wizard-step4'); // Go back to last step
        throw error;
    }
}

/**
 * Show progress animation
 * Returns promise that resolves when animation completes
 */
async function showProgressAnimation() {
    return new Promise((resolve) => {
        console.log('[ANIMATE] Starting progress animation');
        
        const fillEl = document.getElementById('build-progress-fill');
        const stages = [
            { id: 'stage-1', target: 15 },
            { id: 'stage-2', target: 35 },
            { id: 'stage-3', target: 65 },
            { id: 'stage-4', target: 95 }
        ];

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.random() * 20;

            if (currentProgress > 100) {
                currentProgress = 100;
                clearInterval(interval);

                // Mark all stages complete
                stages.forEach(stage => {
                    const el = document.getElementById(stage.id);
                    if (el) {
                        el.classList.remove('active');
                        el.classList.add('completed');
                    }
                });

                // Set progress bar to 100%
                if (fillEl) fillEl.style.width = '100%';

                console.log('[ANIMATE] ✅ Animation complete');
                
                // Small delay before resolving
                setTimeout(() => {
                    console.log('[ANIMATE] ✅ Resolving animation promise');
                    resolve(true);
                }, 500);
            } else {
                // Update progress bar
                if (fillEl) fillEl.style.width = currentProgress + '%';

                // Update stages
                stages.forEach(stage => {
                    const el = document.getElementById(stage.id);
                    if (!el) return;

                    if (currentProgress >= stage.target && !el.classList.contains('active')) {
                        el.classList.add('active');
                    }
                    if (currentProgress >= stage.target + 10) {
                        el.classList.remove('active');
                        el.classList.add('completed');
                    }
                });
            }
        }, 800);
    });
}
