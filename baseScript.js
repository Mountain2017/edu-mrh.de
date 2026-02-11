/**
 * ==========================================
 * BASE SCRIPT - Complete Navigation System
 * ==========================================
 * Ersetzt edu-mrh.de/embed/baseScript.js
 * Grundlegende Navigation mit Scroll-Funktionalität
 */

'use strict';

const NAV_CONFIG = {
    scrollOffset: 80,
    smoothScroll: true,
    scrollDuration: 800,
    mobileBreakpoint: 1024,
    selectors: {
        navbar: '.navbar, nav, header.navbar',
        sidebar: '.sidebar, .side-nav, aside',
        sidebarMenu: '.sidebar-menu, .nav-menu, .side-menu',
        sidebarLink: '.sidebar-menu a, .nav-menu a, .side-menu a, nav a[href^="#"]',
        sidebarToggle: '.sidebar-toggle, #sidebarToggle, .close-sidebar',
        mobileMenuBtn: '.mobile-menu-btn, #mobileMenuBtn, .burger-menu, .menu-toggle',
        sections: 'section[id], .section[id], main section[id], article[id]',
        progressBar: '.progress-bar, #progressBar, .scroll-progress'
    },
    enableHashNavigation: true,
    enableProgressBar: true,
    enableActiveHighlight: true,
    updateUrlOnScroll: false
};

const NAV_STATE = {
    isMobile: false,
    sidebarOpen: false,
    currentSection: null,
    sections: [],
    scrolling: false,
    lastScrollTop: 0,
    initialized: false
};

class BaseNavigation {
    constructor(config = {}) {
        this.config = { ...NAV_CONFIG, ...config };
        this.init();
    }

    init() {
        console.log('🧭 Initializing Base Navigation System...');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        if (NAV_STATE.initialized) {
            console.warn('Navigation already initialized');
            return;
        }
        this.detectDevice();
        this.collectSections();
        this.setupNavbar();
        this.setupSidebar();
        this.setupMobileMenu();
        this.setupScrollSpy();
        this.setupProgressBar();
        this.setupResizeHandler();
        this.setupKeyboardNavigation();
        this.setupAccessibility();
        this.updateActiveSection();
        NAV_STATE.initialized = true;
        console.log('✅ Base Navigation System initialized');
        console.log(`📄 Sections found: ${NAV_STATE.sections.length}`);
        window.dispatchEvent(new CustomEvent('baseScriptLoaded', { detail: { sections: NAV_STATE.sections.map(s => s.id) } }));
    }

    detectDevice() {
        NAV_STATE.isMobile = window.innerWidth <= this.config.mobileBreakpoint;
        document.body.classList.toggle('is-mobile', NAV_STATE.isMobile);
        document.body.classList.toggle('is-desktop', !NAV_STATE.isMobile);
    }

    collectSections() {
        const sectionElements = document.querySelectorAll(this.config.selectors.sections);
        NAV_STATE.sections = Array.from(sectionElements).filter(section => section.id && section.id.trim() !== '').map(section => ({ id: section.id, element: section, offsetTop: section.offsetTop, offsetBottom: section.offsetTop + section.offsetHeight }));
        if (NAV_STATE.sections.length === 0) {
            console.warn('⚠️ No sections with IDs found!');
        } else {
            console.log('📍 Sections:', NAV_STATE.sections.map(s => s.id).join(', '));
        }
    }

    setupNavbar() {
        const navbar = document.querySelector(this.config.selectors.navbar);
        if (!navbar) {
            console.warn('⚠️ Navbar not found');
            return;
        }
        let lastScroll = 0;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScroll = window.pageYOffset;
                    navbar.classList.toggle('scrolled', currentScroll > 50);
                    if (currentScroll > lastScroll && currentScroll > 100) {
                        navbar.style.transform = 'translateY(-100%)';
                        navbar.style.transition = 'transform 0.3s ease';
                    } else {
                        navbar.style.transform = 'translateY(0)';
                    }
                    lastScroll = currentScroll;
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    setupSidebar() {
        const sidebarLinks = document.querySelectorAll(this.config.selectors.sidebarLink);
        if (sidebarLinks.length === 0) {
            console.warn('⚠️ No sidebar links found');
            return;
        }
        console.log(`🔗 Found ${sidebarLinks.length} navigation links`);
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = this.getTargetId(link);
                if (targetId && NAV_STATE.sections.find(s => s.id === targetId)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`→ Navigating to: ${targetId}`);
                    this.scrollToSection(targetId);
                    if (NAV_STATE.isMobile) {
                        setTimeout(() => this.closeSidebar(), 300);
                    }
                }
            });
        });
        const sidebarToggles = document.querySelectorAll(this.config.selectors.sidebarToggle);
        sidebarToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeSidebar();
            });
        });
        document.addEventListener('click', (e) => {
            if (!NAV_STATE.isMobile || !NAV_STATE.sidebarOpen) return;
            const sidebar = document.querySelector(this.config.selectors.sidebar);
            const mobileMenuBtns = document.querySelectorAll(this.config.selectors.mobileMenuBtn);
            const clickedMobileBtn = Array.from(mobileMenuBtns).some(btn => btn.contains(e.target));
            if (sidebar && !sidebar.contains(e.target) && !clickedMobileBtn) {
                this.closeSidebar();
            }
        });
    }

    setupMobileMenu() {
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

    setupScrollSpy() {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
        if (this.config.enableHashNavigation) {
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.substring(1);
                if (hash && NAV_STATE.sections.find(s => s.id === hash)) {
                    this.scrollToSection(hash, false);
                }
            });
            const initialHash = window.location.hash.substring(1);
            if (initialHash && NAV_STATE.sections.find(s => s.id === initialHash)) {
                setTimeout(() => {
                    console.log(`🎯 Scrolling to initial hash: ${initialHash}`);
                    this.scrollToSection(initialHash, false);
                }, 300);
            }
        }
    }

    handleScroll() {
        if (NAV_STATE.scrolling) return;
        this.updateActiveSection();
        if (this.config.enableProgressBar) {
            this.updateProgressBar();
        }
    }

    setupProgressBar() {
        if (!this.config.enableProgressBar) return;
        const progressBar = document.querySelector(this.config.selectors.progressBar);
        if (progressBar) {
            this.updateProgressBar();
        }
    }

    updateProgressBar() {
        const progressBar = document.querySelector(this.config.selectors.progressBar);
        if (!progressBar) return;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollPercentage = (scrollTop / (documentHeight - windowHeight)) * 100;
        progressBar.style.width = `${Math.min(Math.max(scrollPercentage, 0), 100)}%`;
    }

    updateActiveSection() {
        if (!this.config.enableActiveHighlight) return;
        const scrollPosition = window.pageYOffset + this.config.scrollOffset + 100;
        let currentSection = null;
        for (let i = NAV_STATE.sections.length - 1; i >= 0; i--) {
            const section = NAV_STATE.sections[i];
            if (scrollPosition >= section.offsetTop) {
                currentSection = section.id;
                break;
            }
        }
        if (currentSection !== NAV_STATE.currentSection) {
            NAV_STATE.currentSection = currentSection;
            this.highlightActiveLink(currentSection);
            if (this.config.updateUrlOnScroll && currentSection) {
                this.updateHash(currentSection);
            }
        }
    }

    highlightActiveLink(sectionId) {
        const sidebarLinks = document.querySelectorAll(this.config.selectors.sidebarLink);
        sidebarLinks.forEach(link => {
            const targetId = this.getTargetId(link);
            if (targetId === sectionId) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'true');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    scrollToSection(sectionId, updateHash = true) {
        const section = NAV_STATE.sections.find(s => s.id === sectionId);
        if (!section) {
            console.warn(`⚠️ Section "${sectionId}" not found`);
            return;
        }
        NAV_STATE.scrolling = true;
        const targetPosition = section.element.offsetTop - this.config.scrollOffset;
        if (this.config.smoothScroll) {
            this.smoothScrollTo(targetPosition, () => {
                NAV_STATE.scrolling = false;
                if (updateHash && this.config.enableHashNavigation) {
                    this.updateHash(sectionId);
                }
                setTimeout(() => this.updateActiveSection(), 100);
            });
        } else {
            window.scrollTo(0, targetPosition);
            NAV_STATE.scrolling = false;
            if (updateHash && this.config.enableHashNavigation) {
                this.updateHash(sectionId);
            }
            this.updateActiveSection();
        }
    }

    smoothScrollTo(targetPosition, callback) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = this.config.scrollDuration;
        let startTime = null;
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            window.scrollTo(0, startPosition + distance * ease);
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            } else {
                if (callback) callback();
            }
        }
        requestAnimationFrame(animation);
    }

    toggleSidebar() {
        NAV_STATE.sidebarOpen = !NAV_STATE.sidebarOpen;
        const sidebar = document.querySelector(this.config.selectors.sidebar);
        const mobileMenuBtns = document.querySelectorAll(this.config.selectors.mobileMenuBtn);
        if (sidebar) {
            sidebar.classList.toggle('active', NAV_STATE.sidebarOpen);
            sidebar.classList.toggle('open', NAV_STATE.sidebarOpen);
        }
        mobileMenuBtns.forEach(btn => {
            btn.classList.toggle('active', NAV_STATE.sidebarOpen);
        });
        if (NAV_STATE.isMobile) {
            document.body.style.overflow = NAV_STATE.sidebarOpen ? 'hidden' : '';
        }
        console.log(`📱 Sidebar ${NAV_STATE.sidebarOpen ? 'opened' : 'closed'}`);
    }

    openSidebar() {
        if (NAV_STATE.sidebarOpen) return;
        this.toggleSidebar();
    }

    closeSidebar() {
        if (!NAV_STATE.sidebarOpen) return;
        this.toggleSidebar();
    }

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
        const wasMobile = NAV_STATE.isMobile;
        this.detectDevice();
        this.recalculateSections();
        if (wasMobile && !NAV_STATE.isMobile && NAV_STATE.sidebarOpen) {
            this.closeSidebar();
        }
        this.updateActiveSection();
    }

    recalculateSections() {
        NAV_STATE.sections.forEach(section => {
            section.offsetTop = section.element.offsetTop;
            section.offsetBottom = section.element.offsetTop + section.element.offsetHeight;
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });
    }

    setupAccessibility() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Zum Hauptinhalt springen';
        skipLink.style.cssText = 'position:absolute;top:-40px;left:0;background:#3b82f6;color:white;padding:8px;text-decoration:none;z-index:100;';
        skipLink.addEventListener('focus', function() { this.style.top = '0'; });
        skipLink.addEventListener('blur', function() { this.style.top = '-40px'; });
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

        getTargetId(link) {
        let targetId = link.getAttribute('data-section');
        if (!targetId) {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                targetId = href.substring(1);
            }
        }
        if (!targetId) {
            const onclick = link.getAttribute('onclick');
            if (onclick) {
                const match = onclick.match(/['"]([^'"]+)['"]/);
                if (match) {
                    targetId = match[1];
                }
            }
        }
        return targetId;
    }

    updateHash(sectionId) {
        if (!this.config.enableHashNavigation) return;
        if (history.pushState) {
            history.pushState(null, null, `#${sectionId}`);
        } else {
            window.location.hash = sectionId;
        }
    }

    scrollTo(sectionId) {
        this.scrollToSection(sectionId);
    }

    getCurrentSection() {
        return NAV_STATE.currentSection;
    }

    getAllSections() {
        return NAV_STATE.sections.map(s => s.id);
    }

    refresh() {
        this.collectSections();
        this.recalculateSections();
        this.updateActiveSection();
    }
}

function scrollToTop(smooth = true) {
    if (smooth) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo(0, 0);
    }
}

function scrollToElement(elementId, offset = 80) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const targetPosition = element.offsetTop - offset;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
}

function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth));
}

function getScrollPercentage() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return (scrollTop / (documentHeight - windowHeight)) * 100;
}

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

function copyCode(button) {
    const codeBlock = button.parentElement.querySelector('code') || button.parentElement.querySelector('pre');
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

function toggleElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('hidden');
    }
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

function getOffset(element) {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.pageYOffset,
        left: rect.left + window.pageXOffset
    };
}

function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

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

function showNotification(message, type = 'info', duration = 3000) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
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
            backgroundColor: colors[type] || colors.info,
            color: 'white',
            fontWeight: '500'
        }
    }, [message]);
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

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

function formatDate(date, locale = 'de-DE') {
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
}

let baseNavigation;

function initNavigation() {
    if (baseNavigation) {
        console.warn('Navigation already exists');
        return;
    }
    baseNavigation = new BaseNavigation();
    window.baseNavigation = baseNavigation;
    window.eduMrhLoaded = true;
    console.log('🎉 Base Navigation System loaded successfully!');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`⚡ Page loaded in: ${Math.round(loadTime)}ms`);
});

window.addEventListener('error', (e) => {
    console.error('❌ Global Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BaseNavigation,
        scrollToTop,
        scrollToElement,
        isElementInViewport,
        getScrollPercentage,
        debounce,
        throttle,
        copyCode,
        toggleElement,
        showElement,
        hideElement,
        getOffset,
        isVisible,
        createElement,
        showNotification,
        waitForElement,
        formatDate,
        generateId,
        deepClone,
        isEmpty,
        capitalize,
        truncate
    };
}

console.log('%c🚀 Base Script Loaded!', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 5px; font-size: 14px; font-weight: bold;');
