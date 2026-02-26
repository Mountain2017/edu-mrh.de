/**
 * ==========================================
 * GLOBAL JAVASCRIPT - Unified Script
 * ==========================================
 * Seitenübergreifende Funktionalität für komplexe Websites
 * Kombiniert Navigation, UI-Interaktionen, Modals, Progress-Tracking und mehr
 */

'use strict';

// ==========================================
// GLOBAL CONFIGURATION
// ==========================================
const CONFIG = {
    // Navigation
    defaultSection: 'intro',
    enableHashNavigation: true,
    enableKeyboardNavigation: true,
    
    // Progress Tracking
    enableProgressTracking: false,
    progressStorageKey: 'site_progress',
    progressTimestampKey: 'site_progress_timestamp',
    progressExpiryDays: 7,
    
    // UI
    enableSmoothScroll: true,
    scrollOffset: 80,
    animationDuration: 300,
    
    // Mobile
    mobileBreakpoint: 1024,
    tabletBreakpoint: 768,
    
    // Features
    enableAnalytics: false,
    enableServiceWorker: false,
    enableDarkMode: false,
    
    // Selectors
    selectors: {
        navbar: '.navbar',
        sidebar: '.sidebar',
        mainContent: '.main-content',
        contentSection: '.content-section',
        sidebarMenu: '.sidebar-menu',
        sidebarLink: '.sidebar-menu a',
        progressBar: '#progressBar',
        mobileMenuBtn: '#mobileMenuBtn',
        sidebarToggle: '#sidebarToggle',
        modal: '.modal',
        modalClose: '.modal-close'
    }
};

// ==========================================
// STATE MANAGEMENT
// ==========================================
const STATE = {
    currentSection: CONFIG.defaultSection,
    sections: [],
    isMobile: false,
    isTablet: false,
    sidebarOpen: false,
    initialized: false,
    scrollPosition: 0
};

// ==========================================
// INITIALIZATION
// ==========================================
class SiteManager {
    constructor() {
        this.init();
    }

    init() {
        if (STATE.initialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('🚀 Initializing Site Manager...');
        
        // Initialize modules
        this.detectDevice();
        this.collectSections();
        this.setupNavigation();
        this.setupSidebar();
        this.setupMobileMenu();
        this.setupProgressBar();
        this.setupModals();
        this.setupKeyboardNavigation();
        this.setupScrollEffects();
        this.setupResizeHandler();
        
        // Handle initial navigation
        this.handleInitialNavigation();
        
        // Mark as initialized
        STATE.initialized = true;
        
        console.log('✅ Site Manager initialized successfully');
    }

    // Device Detection
    detectDevice() {
        STATE.isMobile = window.innerWidth <= CONFIG.mobileBreakpoint;
        STATE.isTablet = window.innerWidth <= CONFIG.tabletBreakpoint && window.innerWidth > CONFIG.mobileBreakpoint;
        
        document.body.classList.toggle('is-mobile', STATE.isMobile);
        document.body.classList.toggle('is-tablet', STATE.isTablet);
    }

    // Collect all sections
    collectSections() {
        const sectionElements = document.querySelectorAll(CONFIG.selectors.contentSection);
        STATE.sections = Array.from(sectionElements).map(el => el.id).filter(id => id);
        
        console.log(`📄 Found ${STATE.sections.length} sections:`, STATE.sections);
    }

    // Setup Navigation
    setupNavigation() {
    const sidebarLinks = document.querySelectorAll(`${CONFIG.selectors.sidebarLink}, .js-nav-link`);
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href && !href.startsWith('#')) {
                return;
            }

            e.preventDefault();
            
            const section = link.getAttribute('data-section') || href?.substring(1);
            if (section) {
                this.navigateToSection(section);
            }
        });
    });
}

    // Setup Sidebar
    setupSidebar() {
        const sidebarToggle = document.querySelector(CONFIG.selectors.sidebarToggle);
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (!STATE.isMobile) return;
            
            const sidebar = document.querySelector(CONFIG.selectors.sidebar);
            const mobileMenuBtn = document.querySelector(CONFIG.selectors.mobileMenuBtn);
            
            if (sidebar && 
                !sidebar.contains(e.target) && 
                mobileMenuBtn &&
                !mobileMenuBtn.contains(e.target)) {
                this.closeSidebar();
            }
        });
    }

    // Setup Mobile Menu
    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector(CONFIG.selectors.mobileMenuBtn);
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    // Setup Progress Bar
    setupProgressBar() {
        this.updateProgressBar();
    }

    // Setup Modals
    setupModals() {
        const modals = document.querySelectorAll(CONFIG.selectors.modal);
        
        modals.forEach(modal => {
            // Close button
            const closeBtn = modal.querySelector(CONFIG.selectors.modalClose);
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modal);
                });
            }

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    // Setup Keyboard Navigation
    setupKeyboardNavigation() {
        if (!CONFIG.enableKeyboardNavigation) return;

        document.addEventListener('keydown', (e) => {
            // Escape key - close modals and sidebar
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeSidebar();
            }

            // Arrow keys - navigate sections
            if (e.key === 'ArrowRight') {
                this.navigateNext();
            } else if (e.key === 'ArrowLeft') {
                this.navigatePrevious();
            }
        });
    }

    // Setup Scroll Effects
    setupScrollEffects() {
        let lastScrollTop = 0;
        let ticking = false;

        window.addEventListener('scroll', () => {
            STATE.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll(lastScrollTop);
                    lastScrollTop = STATE.scrollPosition;
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Animate elements on scroll
        this.setupScrollAnimations();
    }

    handleScroll(lastScrollTop) {
        const navbar = document.querySelector(CONFIG.selectors.navbar);
        
        if (navbar) {
            // Add scrolled class
            navbar.classList.toggle('scrolled', STATE.scrollPosition > 50);

            // Hide/show navbar on scroll (optional)
            if (STATE.scrollPosition > lastScrollTop && STATE.scrollPosition > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }
    }

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe elements
        const animatedElements = document.querySelectorAll(
            '.example-box, .task-box, .concept-box, .code-example, .card, .info-card'
        );

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = `opacity ${CONFIG.animationDuration * 2}ms ease, transform ${CONFIG.animationDuration * 2}ms ease`;
            observer.observe(el);
        });
    }

    // Setup Resize Handler
    setupResizeHandler() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    handleResize() {
        const wasMobile = STATE.isMobile;
        this.detectDevice();

        // Close sidebar when switching from mobile to desktop
        if (wasMobile && !STATE.isMobile) {
            this.closeSidebar();
        }
    }

    setupFocusManagement() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            const activeModal = document.querySelector('.modal:not(.hidden)');
            if (!activeModal) return;

            const focusableElements = activeModal.querySelectorAll(
                'a[href], button:not([disabled]), textarea, input, select'
            );

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        });
    }

    // Handle Initial Navigation
    handleInitialNavigation() {
        const hash = window.location.hash.substring(1);
        
        if (hash && STATE.sections.includes(hash)) {
            STATE.currentSection = hash;
        }
        
        this.showSection(STATE.currentSection);
        this.updateSidebarActive(STATE.currentSection);
        this.updateProgressBar();
    }

    // ==========================================
    // NAVIGATION METHODS
    // ==========================================
    
    navigateToSection(sectionId) {
        if (!STATE.sections.includes(sectionId)) {
            console.warn(`Section "${sectionId}" not found`);
            return;
        }

        // Update URL hash
        if (CONFIG.enableHashNavigation) {
            window.location.hash = sectionId;
        }

        // Navigate
        this.navigateToSectionWithoutHash(sectionId);
    }

    navigateToSectionWithoutHash(sectionId) {
        if (!STATE.sections.includes(sectionId)) return;

        STATE.currentSection = sectionId;
        
        this.showSection(sectionId);
        this.updateSidebarActive(sectionId);
        this.updateProgressBar();

        // Scroll to top
        if (CONFIG.enableSmoothScroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo(0, 0);
        }

        // Close sidebar on mobile
        if (STATE.isMobile) {
            this.closeSidebar();
        }

        // Track section view
        this.trackSectionView(sectionId);
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll(CONFIG.selectors.contentSection).forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    updateSidebarActive(sectionId) {
        document.querySelectorAll(CONFIG.selectors.sidebarLink).forEach(link => {
            link.classList.remove('active');
            
            const linkSection = link.getAttribute('data-section') || link.getAttribute('href')?.substring(1);
            if (linkSection === sectionId) {
                link.classList.add('active');
            }
        });
    }

    navigateNext() {
        const currentIndex = STATE.sections.indexOf(STATE.currentSection);
        if (currentIndex < STATE.sections.length - 1) {
            this.navigateToSection(STATE.sections[currentIndex + 1]);
        }
    }

    navigatePrevious() {
        const currentIndex = STATE.sections.indexOf(STATE.currentSection);
        if (currentIndex > 0) {
            this.navigateToSection(STATE.sections[currentIndex - 1]);
        }
    }

    // ==========================================
    // PROGRESS BAR
    // ==========================================

    updateProgressBar() {
        const progressBar = document.querySelector(CONFIG.selectors.progressBar);
        if (!progressBar) return;

        const currentIndex = STATE.sections.indexOf(STATE.currentSection);
        const progress = ((currentIndex + 1) / STATE.sections.length) * 100;
        
        progressBar.style.width = `${progress}%`;
    }

    // ==========================================
    // SIDEBAR METHODS
    // ==========================================

    toggleSidebar() {
        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        const mobileMenuBtn = document.querySelector(CONFIG.selectors.mobileMenuBtn);
        
        if (sidebar) {
            STATE.sidebarOpen = !STATE.sidebarOpen;
            sidebar.classList.toggle('active');
            sidebar.classList.toggle('open');
        }
        
        if (mobileMenuBtn) {
            mobileMenuBtn.classList.toggle('active');
        }
    }

    closeSidebar() {
        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        const mobileMenuBtn = document.querySelector(CONFIG.selectors.mobileMenuBtn);
        
        if (sidebar) {
            STATE.sidebarOpen = false;
            sidebar.classList.remove('active', 'open');
        }
        
        if (mobileMenuBtn) {
            mobileMenuBtn.classList.remove('active');
        }
    }

    openSidebar() {
        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        const mobileMenuBtn = document.querySelector(CONFIG.selectors.mobileMenuBtn);
        
        if (sidebar) {
            STATE.sidebarOpen = true;
            sidebar.classList.add('active', 'open');
        }
        
        if (mobileMenuBtn) {
            mobileMenuBtn.classList.add('active');
        }
    }

    // ==========================================
    // MODAL METHODS
    // ==========================================

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus first focusable element
            const focusable = modal.querySelector('button, a, input, textarea');
            if (focusable) {
                setTimeout(() => focusable.focus(), 100);
            }
        }
    }

    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        document.querySelectorAll(CONFIG.selectors.modal).forEach(modal => {
            this.closeModal(modal);
        });
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    scrollToElement(elementId, offset = CONFIG.scrollOffset) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: CONFIG.enableSmoothScroll ? 'smooth' : 'auto'
        });
    }

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    trackSectionView(sectionId) {
        if (!CONFIG.enableAnalytics) return;
        
        console.log('Section viewed:', sectionId);
        
        // Analytics tracking would go here
        // Example: gtag('event', 'page_view', { page_path: `/${sectionId}` });
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    getState() {
        return { ...STATE };
    }

    getCurrentSection() {
        return STATE.currentSection;
    }

    getAllSections() {
        return [...STATE.sections];
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Load and render KaTeX-Script
 */ 
        function renderMath() {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},  
                    {left: '$', right: '$', display: false}    
                ],
                throwOnError : false
            });
        }

/**
 * Toggle solution visibility
 */
function toggleSolution(solutionId) {
    const solution = document.getElementById(solutionId);
    if (solution) {
        solution.classList.toggle('hidden');
    }
}

/**
 * Copy code to clipboard
 */
function copyCode(button) {
    const codeBlock = button.parentElement.querySelector('code') || 
                     button.parentElement.querySelector('pre');
    
    if (!codeBlock) return;

    const code = codeBlock.textContent;

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Kopiert!';
        button.style.background = '#10b981';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Fehler beim Kopieren:', err);
        alert('Kopieren fehlgeschlagen. Bitte manuell kopieren.');
    });
}

/**
 * Download code as file
 */
function downloadCode(filename, code) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(code));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

/**
 * Show completion modal
 */
function showCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.classList.remove('hidden');
        createConfetti();
    }
}

/**
 * Close completion modal
 */
function closeCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Create confetti effect
 */
function createConfetti() {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * window.innerWidth}px;
                top: -10px;
                opacity: 1;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
            `;

            document.body.appendChild(confetti);

            const duration = 2000 + Math.random() * 1000;
            const rotation = Math.random() * 360;

            confetti.animate([
                {
                    transform: 'translateY(0) rotate(0deg)',
                    opacity: 1
                },
                {
                    transform: `translateY(${window.innerHeight}px) rotate(${rotation}deg)`,
                    opacity: 0
                }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });

            setTimeout(() => confetti.remove(), duration);
        }, i * 30);
    }
}

/**
 * Print certificate or page
 */
function printCertificate() {
    window.print();
}

/**
 * Show/hide element
 */
function toggleElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('hidden');
    }
}

/**
 * Smooth scroll to top
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Format date
 */
function formatDate(date, locale = 'de-DE') {
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================
// CODE HIGHLIGHTING (if Prism.js is available)
// ==========================================
function highlightCode() {
    if (window.Prism && typeof Prism.highlightAll === 'function') {
        Prism.highlightAll();
    }
}

// ==========================================
// PERFORMANCE MONITORING
// ==========================================
window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`⚡ Page loaded in: ${Math.round(loadTime)}ms`);

    // Performance metrics
    if (window.performance && window.performance.timing) {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;

        console.log('📊 Performance Metrics:');
        console.log(`   Page Load Time: ${pageLoadTime}ms`);
        console.log(`   Connect Time: ${connectTime}ms`);
        console.log(`   Render Time: ${renderTime}ms`);
    }
});

// ==========================================
// ERROR HANDLING
// ==========================================
window.addEventListener('error', (e) => {
    console.error('❌ Global Error:', e.error);
    
    // Optional: Send to error tracking service
    // Example: Sentry.captureException(e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
    
    // Optional: Send to error tracking service
    // Example: Sentry.captureException(e.reason);
});

// ==========================================
// SERVICE WORKER (PWA Support)
// ==========================================
if (CONFIG.enableServiceWorker && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}

// ==========================================
// DARK MODE SUPPORT
// ==========================================
class DarkModeManager {
    constructor() {
        this.enabled = CONFIG.enableDarkMode;
        if (this.enabled) {
            this.init();
        }
    }

    init() {
        // Check for saved preference or system preference
        const savedMode = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedMode === 'true' || (!savedMode && prefersDark)) {
            this.enable();
        }

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('darkMode')) {
                e.matches ? this.enable() : this.disable();
            }
        });
    }

    enable() {
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    }

    disable() {
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }

    toggle() {
        if (document.documentElement.classList.contains('dark-mode')) {
            this.disable();
        } else {
            this.enable();
        }
    }
}

// ==========================================
// PRINT HANDLING
// ==========================================
window.addEventListener('beforeprint', () => {
    // Show all sections for printing
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'block';
    });
});

window.addEventListener('afterprint', () => {
    // Restore original display
    document.querySelectorAll('.content-section').forEach(section => {
        if (!section.classList.contains('active')) {
            section.style.display = 'none';
        }
    });
});

// ==========================================
// EXPORT & INITIALIZATION
// ==========================================

// Create global instance
let siteManager;
let darkModeManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

function initializeApp() {
    siteManager = new SiteManager();
    darkModeManager = new DarkModeManager();
    
    // Expose to window for debugging
    window.siteManager = siteManager;
    window.darkModeManager = darkModeManager;
    
    // Highlight code if Prism is available
    highlightCode();
    
    console.log('🎉 Application initialized successfully!');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SiteManager,
        DarkModeManager,
        toggleSolution,
        copyCode,
        downloadCode,
        showCompletionModal,
        closeCompletionModal,
        createConfetti,
        printCertificate,
        toggleElement,
        scrollToTop,
        formatDate,
        debounce,
        throttle,
        highlightCode
    };
}

// ==========================================
// ADDITIONAL HELPER FUNCTIONS
// ==========================================

/**
 * Get query parameter from URL
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set query parameter in URL
 */
function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

/**
 * Remove query parameter from URL
 */
function removeQueryParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}

/**
 * Check if element is visible
 */
function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

/**
 * Get element offset
 */
function getOffset(element) {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.pageYOffset,
        left: rect.left + window.pageXOffset
    };
}

/**
 * Animate element
 */
function animateElement(element, animation, duration = 300) {
    return new Promise((resolve) => {
        element.style.animation = `${animation} ${duration}ms ease`;
        
        function handleAnimationEnd() {
            element.style.animation = '';
            element.removeEventListener('animationend', handleAnimationEnd);
            resolve();
        }
        
        element.addEventListener('animationend', handleAnimationEnd);
    });
}

/**
 * Wait for element to exist
 */
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Create element with attributes
 */
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    
    return element;
}

/**
 * Show notification/toast
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = createElement('div', {
        className: `notification notification-${type}`,
        style: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: '9999',
            animation: 'slideIn 0.3s ease',
            backgroundColor: type === 'success' ? '#10b981' : 
                           type === 'error' ? '#ef4444' : 
                           type === 'warning' ? '#f59e0b' : '#3b82f6',
            color: 'white'
        }
    }, [message]);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/**
 * Validate email
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate URL
 */
function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate random ID
 */
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text
 */
function truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num, locale = 'de-DE') {
    return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'EUR', locale = 'de-DE') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Calculate reading time
 */
function calculateReadingTime(text, wordsPerMinute = 200) {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
}

/**
 * Get cookie
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

/**
 * Set cookie
 */
function setCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

/**
 * Delete cookie
 */
function deleteCookie(name) {
    setCookie(name, '', -1);
}

// ==========================================
// CONSOLE STYLING
// ==========================================
console.log(
    '%c🚀 Global Scripts Loaded Successfully! ',
    'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 5px; font-size: 14px; font-weight: bold;'
);

console.log(
    '%cVersion: 1.0.0 | Built with ❤️',
    'color: #64748b; font-size: 12px;'
);

// ==========================================
// END OF GLOBAL SCRIPTS
// ==========================================
