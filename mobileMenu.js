/**
 * ==========================================
 * MOBILE MENU SCRIPT
 * ==========================================
 * Einfaches Script nur für Mobile Menu Button
 * Für Übersichtsseiten
 */

'use strict';

// ==========================================
// CONFIGURATION
// ==========================================
const MOBILE_CONFIG = {
    mobileBreakpoint: 1024,
    selectors: {
        sidebar: '.sidebar, .side-nav, aside',
        mobileMenuBtn: '.mobile-menu-btn, #mobileMenuBtn, .burger-menu, .menu-toggle',
        sidebarToggle: '.sidebar-toggle, #sidebarToggle, .close-sidebar'
    }
};

// ==========================================
// STATE
// ==========================================
const MOBILE_STATE = {
    isMobile: false,
    sidebarOpen: false
};

// ==========================================
// MOBILE MENU CLASS
// ==========================================
class MobileMenu {
    constructor(config = {}) {
        this.config = { ...MOBILE_CONFIG, ...config };
        this.init();
    }

    init() {
        console.log('📱 Initializing Mobile Menu...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.detectDevice();
        this.setupMobileMenuButton();
        this.setupSidebarToggle();
        this.setupOutsideClick();
        this.setupResizeHandler();
        this.setupKeyboard();
        
        console.log('✅ Mobile Menu initialized');
    }

    detectDevice() {
        MOBILE_STATE.isMobile = window.innerWidth <= this.config.mobileBreakpoint;
        document.body.classList.toggle('is-mobile', MOBILE_STATE.isMobile);
    }

    setupMobileMenuButton() {
        const mobileMenuBtns = document.querySelectorAll(this.config.selectors.mobileMenuBtn);
        
        if (mobileMenuBtns.length === 0) {
            console.warn('⚠️ No mobile menu buttons found');
            return;
        }

        console.log(`📱 Found ${mobileMenuBtns.length} mobile menu button(s)`);

        mobileMenuBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebar();
            });
        });
    }

    setupSidebarToggle() {
        const sidebarToggles = document.querySelectorAll(this.config.selectors.sidebarToggle);
        
        sidebarToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeSidebar();
            });
        });
    }

    setupOutsideClick() {
        document.addEventListener('click', (e) => {
            if (!MOBILE_STATE.isMobile || !MOBILE_STATE.sidebarOpen) return;
            
            const sidebar = document.querySelector(this.config.selectors.sidebar);
            const mobileMenuBtns = document.querySelectorAll(this.config.selectors.mobileMenuBtn);
            
            const clickedMobileBtn = Array.from(mobileMenuBtns).some(btn => btn.contains(e.target));
            
            if (sidebar && !sidebar.contains(e.target) && !clickedMobileBtn) {
                this.closeSidebar();
            }
        });
    }

    setupResizeHandler() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const wasMobile = MOBILE_STATE.isMobile;
                this.detectDevice();
                
                if (wasMobile && !MOBILE_STATE.isMobile && MOBILE_STATE.sidebarOpen) {
                    this.closeSidebar();
                }
            }, 250);
        });
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && MOBILE_STATE.sidebarOpen) {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        MOBILE_STATE.sidebarOpen = !MOBILE_STATE.sidebarOpen;
        
        const sidebar = document.querySelector(this.config.selectors.sidebar);
        const mobileMenuBtns = document.querySelectorAll(this.config.selectors.mobileMenuBtn);
        
        if (sidebar) {
            sidebar.classList.toggle('active', MOBILE_STATE.sidebarOpen);
            sidebar.classList.toggle('open', MOBILE_STATE.sidebarOpen);
        }
        
        mobileMenuBtns.forEach(btn => {
            btn.classList.toggle('active', MOBILE_STATE.sidebarOpen);
        });
        
        if (MOBILE_STATE.isMobile) {
            document.body.style.overflow = MOBILE_STATE.sidebarOpen ? 'hidden' : '';
        }
        
        console.log(`📱 Sidebar ${MOBILE_STATE.sidebarOpen ? 'opened' : 'closed'}`);
    }

    openSidebar() {
        if (MOBILE_STATE.sidebarOpen) return;
        this.toggleSidebar();
    }

    closeSidebar() {
        if (!MOBILE_STATE.sidebarOpen) return;
        this.toggleSidebar();
    }
}

// ==========================================
// GLOBAL INSTANCE
// ==========================================
let mobileMenu;

function initMobileMenu() {
    if (mobileMenu) {
        console.warn('Mobile Menu already exists');
        return;
    }
    
    mobileMenu = new MobileMenu();
    window.mobileMenu = mobileMenu;
    console.log('🎉 Mobile Menu loaded!');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}

// ==========================================
// EXPORT
// ==========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileMenu };
}

console.log('%c📱 Mobile Menu Script Loaded!', 'background: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;');
