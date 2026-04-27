(function () {
    "use strict";

    const MOBILE_MAX = 1024;

    function isSmallScreen() {
        return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
    }

    function findSidebar() {
        return document.querySelector(
            "aside#sidebar, aside.sidebar, aside.w-56, aside.w-64, aside.w-72, aside"
        );
    }

    function skipForNativeDrawer(sidebar) {
        return !!(
            sidebar &&
            sidebar.id === "sidebar" &&
            document.getElementById("mobile-menu-btn") &&
            sidebar.classList.contains("-translate-x-full")
        );
    }

    function createOverlay() {
        let overlay = document.querySelector(".mobile-drawer-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "mobile-drawer-overlay";
            overlay.setAttribute("aria-hidden", "true");
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function createTrigger() {
        let trigger = document.querySelector(".mobile-drawer-trigger");
        if (!trigger) {
            trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "mobile-drawer-trigger";
            trigger.setAttribute("aria-label", "Open navigation");
            trigger.setAttribute("aria-expanded", "false");
            trigger.innerHTML = "\u2630";
            document.body.appendChild(trigger);
        }
        return trigger;
    }

    function closeDrawer(sidebar, trigger) {
        document.body.classList.remove("mobile-drawer-open");
        if (sidebar) {
            sidebar.classList.remove("is-open");
            sidebar.setAttribute("aria-hidden", "true");
        }
        if (trigger) {
            trigger.setAttribute("aria-expanded", "false");
        }
    }

    function openDrawer(sidebar, trigger) {
        document.body.classList.add("mobile-drawer-open");
        if (sidebar) {
            sidebar.classList.add("is-open");
            sidebar.setAttribute("aria-hidden", "false");
        }
        if (trigger) {
            trigger.setAttribute("aria-expanded", "true");
        }
    }

    function bindDrawer(sidebar) {
        const overlay = createOverlay();
        const trigger = document.getElementById("mobile-menu-btn") || createTrigger();

        document.body.classList.add("mobile-drawer-active");
        sidebar.classList.add("mobile-drawer");
        sidebar.setAttribute("aria-hidden", "true");

        const toggle = function () {
            const isOpen = document.body.classList.contains("mobile-drawer-open");
            if (isOpen) {
                closeDrawer(sidebar, trigger);
            } else {
                openDrawer(sidebar, trigger);
            }
        };

        trigger.addEventListener("click", toggle);
        overlay.addEventListener("click", function () {
            closeDrawer(sidebar, trigger);
        });

        sidebar.querySelectorAll("a, button").forEach(function (el) {
            el.addEventListener("click", function () {
                if (isSmallScreen()) {
                    closeDrawer(sidebar, trigger);
                }
            });
        });

        window.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeDrawer(sidebar, trigger);
            }
        });

        window.addEventListener("resize", function () {
            if (!isSmallScreen()) {
                closeDrawer(sidebar, trigger);
            }
        });
    }

    function initMobileSystem() {
        const sidebar = findSidebar();
        if (!sidebar || skipForNativeDrawer(sidebar)) {
            return;
        }

        bindDrawer(sidebar);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMobileSystem);
    } else {
        initMobileSystem();
    }
})();
