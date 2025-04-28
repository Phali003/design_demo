/**
 * Murage Konnect - Main JavaScript
 * Handles interactive functionality across the platform
 */

document.addEventListener('DOMContentLoaded', function() {
    // -----------------------------------------
    // Login Button Redirect
    // -----------------------------------------
    const loginBtn = document.getElementById('loginBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'pages/auth/login.html';
        });
    }

    // -----------------------------------------
    // Header Scroll Behavior
    // -----------------------------------------
    const header = document.querySelector('.header');
    let lastScrollPosition = 0;
    
    function handleScroll() {
        const currentScrollPosition = window.pageYOffset;
        
        if (currentScrollPosition > 10) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
        
        if (currentScrollPosition > lastScrollPosition && currentScrollPosition > 200) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        
        lastScrollPosition = currentScrollPosition;
    }
    
    // Throttle scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(function() {
                handleScroll();
                scrollTimeout = null;
            }, 10);
        }
    });
    
    // -----------------------------------------
    // Smooth Scroll for Anchor Links
    // -----------------------------------------
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            if (targetId !== '#') {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const headerHeight = header ? header.offsetHeight : 0;
                    
                    window.scrollTo({
                        top: targetElement.offsetTop - headerHeight,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // -----------------------------------------
    // Feature Card Animations
    // -----------------------------------------
    const featureCards = document.querySelectorAll('.feature-card');
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    function animateOnScroll() {
        [featureCards, pricingCards].forEach(cards => {
            cards.forEach(card => {
                const cardPosition = card.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;
                
                if (cardPosition < windowHeight - 100) {
                    card.classList.add('animated');
                }
            });
        });
    }
    
    // Initial animation check and throttled scroll listener
    animateOnScroll();
    let animationTimeout;
    window.addEventListener('scroll', function() {
        if (!animationTimeout) {
            animationTimeout = setTimeout(function() {
                animateOnScroll();
                animationTimeout = null;
            }, 50);
        }
    });

    // Animation styles
    const style = document.createElement('style');
    style.textContent = `
        .feature-card:nth-child(4).animated,
        .pricing-card:nth-child(4).animated {
            animation-delay: 0.4s;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // -----------------------------------------
    // Contact Form Validation
    // -----------------------------------------
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const subjectInput = document.getElementById('subject');
            const messageInput = document.getElementById('message');
            
            let isValid = true;
            
            // Clear previous errors
            document.querySelectorAll('.error-message').forEach(error => error.remove());
            document.querySelectorAll('.form-group.error').forEach(group => group.classList.remove('error'));
            
            // Validation checks
            if (!nameInput.value.trim()) {
                showError(nameInput, 'Please enter your name');
                isValid = false;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
                showError(emailInput, 'Please enter a valid email address');
                isValid = false;
            }
            
            if (!subjectInput.value.trim()) {
                showError(subjectInput, 'Please enter a subject');
                isValid = false;
            }
            
            if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
                showError(messageInput, 'Please enter a message with at least 10 characters');
                isValid = false;
            }
            
            if (isValid) {
                handleFormSubmission(contactForm);
            }
        });
    }
    
    function showError(input, message) {
        const formGroup = input.closest('.form-group');
        formGroup.classList.add('error');
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        
        formGroup.appendChild(errorMessage);
    }
    
    function handleFormSubmission(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        submitButton.classList.add('loading');
        
        setTimeout(() => {
            form.reset();
            
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Your message has been sent successfully!';
            form.prepend(successMessage);
            
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.classList.remove('loading');
            
            setTimeout(() => successMessage.remove(), 5000);
        }, 1500);
    }
});
        }
        
        .feature-card:nth-child(2).animated,
        .pricing-card:nth-child(2).animated {
            animation-delay: 0.2s;
        }
        
        .feature-card:nth-child(3).animated,
        .pricing-card:nth-child(3).animated {
            animation-delay: 0.3s;
        }
        
        .feature-card:nth-child(4).animated,
        .pricing-card:nth-child(4).animated {
            animation-delay: 

