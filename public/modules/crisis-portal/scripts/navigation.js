/**
 * ResQAI Crisis Portal - Navigation Module
 * Handles sidebar navigation and page transitions
 */

import { setState } from './core.js';

export const NavigationModule = {

    /**
     * Initialize navigation
     */
    init() {
        console.log('✓ Navigation Module initialized');
        this.attachSidebarListeners();
        this.attachBackButton();
    },

    /**
     * Attach sidebar navigation listeners
     */
    attachSidebarListeners() {
        const navLinks = document.querySelectorAll('aside nav a');

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Natural page navigation - let links work normally
                setState('currentPage', link.textContent.trim().toLowerCase().replace(' ', '-'));
            });
        });
    },

    /**
     * Attach back button (logo)
     */
    attachBackButton() {
        const homeLink = document.querySelector('a.text-xl.font-black.text-rose-500');

        if (homeLink) {
            homeLink.href = '/pages/module-selection.html';
        }
    }
};

export default NavigationModule;
