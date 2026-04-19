// ============================================
// ResQAI — Scroll-Driven Video Animation Engine
// Maps scroll position to video currentTime
// for ultra-smooth cinematic playback.
//
// Architecture:
//   1. VIDEO INIT — wait for loadedmetadata
//   2. SCROLL     — passive listener stores target time
//   3. RAF LOOP   — lerps currentTime toward target
//   4. PHASES     — toggle text overlays by progress
// ============================================

(function () {
    'use strict';

    // ------------------------------------------
    // CONFIGURATION
    // ------------------------------------------

    // Micro-smoothing factor (0.1 means very quick, nearly instant)
    // Adjust higher (like 0.5) if jitter occurs, but 1.0 is direct sync
    var LERP_FACTOR  = 0.5;

    // Snap to target if gap is very small (removes micro-stutter)
    var SNAP_THRESHOLD = 0.005;

    // Phase scroll ranges (0→1)
    var PHASES = [
        { id: 1, start: 0.00, end: 0.16 },
        { id: 2, start: 0.16, end: 0.33 },
        { id: 3, start: 0.33, end: 0.50 },
        { id: 4, start: 0.50, end: 0.66 },
        { id: 5, start: 0.66, end: 0.83 },
        { id: 6, start: 0.83, end: 1.00 }
    ];

    // ------------------------------------------
    // STATE
    // ------------------------------------------
    var video          = null;   // <video> element
    var scrollSection  = null;   // the tall scroll container
    var isReady        = false;  // true when video metadata loaded
    var videoDuration  = 0;      // total video duration in seconds

    var targetTime     = 0;      // where scroll wants the video to be
    var currentTime    = 0;      // where the video actually is (lerped)
    var activePhase    = -1;     // currently visible storytelling phase

    // ------------------------------------------
    // 1. VIDEO INITIALIZATION
    // Waits for metadata, then starts the system.
    // ------------------------------------------

    // Sets up the video element and waits for it to be ready
    function setupVideo() {
        video = document.getElementById('scroll-video');
        if (!video) {
            console.error('[ResQAI] Video element #scroll-video not found');
            return;
        }

        // Track real buffering progress from the video element
        video.addEventListener('progress', updateBufferProgress);

        // Multiple readiness events as fallbacks
        video.addEventListener('loadedmetadata', onVideoReady);
        video.addEventListener('canplay', onVideoReady);
        video.addEventListener('canplaythrough', onVideoReady);

        // If already loaded (browser cache), fire immediately
        if (video.readyState >= 2) {
            onVideoReady();
        }

        // Safety timeout: if nothing fires in 8s, force-start anyway
        setTimeout(function () {
            if (!isReady) {
                console.warn('[ResQAI] Video timeout — forcing ready state');
                onVideoReady();
            }
        }, 8000);
    }

    // Updates loader bar based on actual video buffer progress
    function updateBufferProgress() {
        if (!video || !video.buffered || video.buffered.length === 0) return;

        var bufferedEnd = video.buffered.end(video.buffered.length - 1);
        var duration = video.duration || 1;
        var pct = Math.min((bufferedEnd / duration) * 100, 95);

        var fill = document.querySelector('.loader-progress-fill');
        if (fill) fill.style.width = pct + '%';

        var text = document.querySelector('.loader-system-text');
        if (text) text.textContent = 'Loading... ' + Math.floor(pct) + '%';
    }

    // Called when video is ready to play (may fire multiple times — guarded)
    function onVideoReady() {
        if (isReady) return; // only run once

        videoDuration = video.duration;
        console.log('[ResQAI] Video ready. Duration:', videoDuration.toFixed(2) + 's');

        // Set initial position
        video.currentTime = 0;
        isReady = true;

        // Hide loader
        hideLoader();
    }

    // ------------------------------------------
    // 2. SCROLL TRACKING
    // Passive listener — only stores the target.
    // ------------------------------------------

    // Returns normalized scroll progress (0→1) through the scroll section
    function readScrollProgress() {
        if (!scrollSection) return 0;

        var rect = scrollSection.getBoundingClientRect();
        var scrollableHeight = scrollSection.offsetHeight - window.innerHeight;

        if (scrollableHeight <= 0) return 0;

        var scrolled = -rect.top;
        return Math.max(0, Math.min(1, scrolled / scrollableHeight));
    }

    // Passive scroll listener: calculates target video time
    function setupScrollListener() {
        window.addEventListener('scroll', function () {
            if (!isReady) return;

            var progress = readScrollProgress();
            targetTime = progress * videoDuration;
        }, { passive: true });
    }

    // ------------------------------------------
    // 3. ANIMATION LOOP (rAF)
    // Continuously lerps video.currentTime toward target.
    // ------------------------------------------

    function animationLoop() {
        requestAnimationFrame(animationLoop);

        if (!isReady || !video) return;

        var diff = targetTime - currentTime;

        // Snap when close enough
        if (Math.abs(diff) < SNAP_THRESHOLD) {
            currentTime = targetTime;
        } else {
            // Micro-smoothing: fast enough to feel instant, 
            // smooth enough to prevent frame tearing
            currentTime += diff * LERP_FACTOR;
        }

        // Apply immediately
        if (Math.abs(video.currentTime - currentTime) > 0.005) {
            video.currentTime = currentTime;
        }

        // Update storytelling phase based on scroll progress
        var progress = videoDuration > 0 ? currentTime / videoDuration : 0;
        var phase = getPhaseForProgress(progress);
        updatePhases(phase);
    }

    // ------------------------------------------
    // 4. STORYTELLING PHASES
    // Shows/hides text overlays based on progress.
    // ------------------------------------------

    // Determines which phase (1-6) is active for a given progress
    function getPhaseForProgress(progress) {
        for (var i = 0; i < PHASES.length; i++) {
            if (progress >= PHASES[i].start && progress < PHASES[i].end) {
                return PHASES[i].id;
            }
        }
        if (progress >= 1) return PHASES[PHASES.length - 1].id;
        return 1;
    }

    // Toggles .active class on phase elements and progress dots
    function updatePhases(newPhase) {
        if (newPhase === activePhase) return;

        // Deactivate old phase
        var oldEl = document.querySelector('.phase-content[data-phase="' + activePhase + '"]');
        if (oldEl) oldEl.classList.remove('active');

        // Activate new phase
        var newEl = document.querySelector('.phase-content[data-phase="' + newPhase + '"]');
        if (newEl) newEl.classList.add('active');

        // Update scroll progress dots
        var dots = document.querySelectorAll('.progress-dot');
        dots.forEach(function (dot, index) {
            dot.classList.toggle('active', index + 1 === newPhase);
        });

        activePhase = newPhase;
    }

    // ------------------------------------------
    // 5. LOADER
    // Shows loading state, fades out when ready.
    // ------------------------------------------

    function hideLoader() {
        var loader = document.getElementById('landing-loader');
        if (!loader) return;

        // Update status text
        var text = document.querySelector('.loader-system-text');
        if (text) text.textContent = 'System ready';

        var fill = document.querySelector('.loader-progress-fill');
        if (fill) fill.style.width = '100%';

        setTimeout(function () {
            loader.classList.add('hidden');

            // Set initial state
            targetTime = readScrollProgress() * videoDuration;
            currentTime = targetTime;
            updatePhases(1);
        }, 600);
    }

    // No simulated progress needed — updateBufferProgress handles real tracking

    // ------------------------------------------
    // 6. FINAL SECTION (IntersectionObserver)
    // ------------------------------------------

    function setupFinalSection() {
        var section = document.querySelector('.final-section');
        if (!section) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var heading = section.querySelector('.final-heading');
                    var subtext = section.querySelector('.final-subtext');
                    var buttons = section.querySelector('.final-buttons');

                    if (heading) heading.classList.add('visible');
                    if (subtext) subtext.classList.add('visible');
                    if (buttons) buttons.classList.add('visible');
                }
            });
        }, { threshold: 0.25 });

        observer.observe(section);
    }

    // ------------------------------------------
    // 7. PAGE TRANSITION
    // ------------------------------------------

    function setupNavigation() {
        var buttons = document.querySelectorAll('[data-navigate]');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var target = btn.getAttribute('data-navigate');
                var overlay = document.getElementById('page-transition');

                if (overlay) {
                    overlay.classList.add('active');
                    setTimeout(function () {
                        window.location.href = target;
                    }, 500);
                } else {
                    window.location.href = target;
                }
            });
        });
    }

    // ------------------------------------------
    // 8. INITIALIZE
    // ------------------------------------------

    function init() {
        scrollSection = document.querySelector('.scroll-section');

        // 1. Initialize video (waits for metadata + buffer events)
        setupVideo();

        // 3. Set up passive scroll listener
        setupScrollListener();

        // 4. Start the rAF loop (runs forever, waits for isReady)
        requestAnimationFrame(animationLoop);

        // 5. Final section reveal
        setupFinalSection();

        // 6. Page transitions
        setupNavigation();
    }

    // Run when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
