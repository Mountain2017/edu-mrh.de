// ==================== //
// Global Variables
// ==================== //
let currentChapter = 0;
const totalChapters = 5;

// ==================== //
// Navigation Functions
// ==================== //
function navigateToChapter(chapterNumber) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.querySelectorAll('.content-section')[chapterNumber];
    if (targetSection) {
        targetSection.classList.add('active');
        currentChapter = chapterNumber;
        
        // Update progress bar
        updateProgressBar();
        
        // Update sidebar active state
        updateSidebarActive(chapterNumber);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Close mobile sidebar if open
        closeMobileSidebar();
    }
}

function updateProgressBar() {
    const progress = (currentChapter / totalChapters) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

function updateSidebarActive(chapterNumber) {
    document.querySelectorAll('.sidebar-menu a').forEach((link, index) => {
        link.classList.remove('active');
        if (index === chapterNumber) {
            link.classList.add('active');
        }
    });
}

// ==================== //
// Solution Toggle
// ==================== //
function toggleSolution(solutionId) {
    const solution = document.getElementById(solutionId);
    if (solution) {
        solution.classList.toggle('hidden');
    }
}

// ==================== //
// Completion Modal
// ==================== //
function showCompletion() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideCompletion() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Navigate to start
    navigateToChapter(0);
}

// ==================== //
// Mobile Menu
// ==================== //
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 1024) {
        sidebar.classList.remove('active');
    }
}

// ==================== //
// Event Listeners
// ==================== //
document.addEventListener('DOMContentLoaded', function() {
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-menu a').forEach((link, index) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToChapter(index);
        });
    });

    // Mobile menu button
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }

    // Sidebar toggle button
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', closeMobileSidebar);
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        
        if (window.innerWidth <= 1024 && 
            sidebar && 
            !sidebar.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            closeMobileSidebar();
        }
    });

    // Close modal when clicking outside
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideCompletion();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Left arrow - previous chapter
        if (e.key === 'ArrowLeft' && currentChapter > 0) {
            navigateToChapter(currentChapter - 1);
        }
        // Right arrow - next chapter
        if (e.key === 'ArrowRight' && currentChapter < totalChapters) {
            navigateToChapter(currentChapter + 1);
        }
        // Escape - close modal/sidebar
        if (e.key === 'Escape') {
            hideCompletion();
            closeMobileSidebar();
        }
    });

    // Initialize progress bar
    updateProgressBar();

    // Ensure Prism highlights code after DOM is ready (if Prism is available)
    if (window.Prism && typeof Prism.highlightAll === 'function') {
        Prism.highlightAll();
    }

    // Add smooth scrolling to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all major content blocks
    document.querySelectorAll('.example-box, .task-box, .concept-box, .code-example').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Print functionality
    window.addEventListener('beforeprint', function() {
        // Show all sections for printing
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'block';
        });
    });

    window.addEventListener('afterprint', function() {
        // Restore original display
        document.querySelectorAll('.content-section').forEach(section => {
            if (!section.classList.contains('active')) {
                section.style.display = 'none';
            }
        });
    });
});

// ==================== //
// Utility Functions
// ==================== //

// Copy code to clipboard
function copyCode(button) {
    const codeBlock = button.parentElement.querySelector('code');
    if (codeBlock) {
        const text = codeBlock.textContent;
        navigator.clipboard.writeText(text).then(() => {
            button.textContent = '✓ Kopiert!';
            setTimeout(() => {
                button.textContent = 'Code kopieren';
            }, 2000);
        });
    }
}

// Download code as file
function downloadCode(filename, code) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(code));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Track user progress in localStorage
function saveProgress() {
    localStorage.setItem('concurrency_progress', currentChapter);
}

function loadProgress() {
    const saved = localStorage.getItem('concurrency_progress');
    if (saved !== null) {
        navigateToChapter(parseInt(saved));
    }
}

// Load saved progress on page load
window.addEventListener('load', loadProgress);

// Save progress when navigating
window.addEventListener('beforeunload', saveProgress);
