// Import theme configuration
import { initializeTheme, setupThemeToggle } from '../shared/theme-config.js';
import { auth, googleProvider } from "./firebase-config.js";
import { signInWithEmailAndPassword, signInWithPopup,sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const googleSignInButton = document.getElementById('google-signin');

// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    setupThemeToggle();

    // Admin login button handler
    const adminLoginBtn = document.getElementById('admin-login');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            window.location.href = '../admin/login/login.html';
        });
    }
});

// Function to show error message below input
function showError(element, message) {
    let errorDiv = element.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('error-message')) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        element.parentNode.insertBefore(errorDiv, element.nextSibling);
    }
    errorDiv.textContent = message;
}

function clearError(element) {
    let errorDiv = element.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.remove();
    }
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    clearError(emailInput);
    clearError(passwordInput);
    if (!email) {
        showError(emailInput, 'Email is required');
        return;
    }
    if (!password) {
        showError(passwordInput, 'Password is required');
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '../home/home.html';
    } catch (error) {
        switch (error.code) {
            case 'auth/invalid-email':
                showError(emailInput, 'Invalid email address.');
                break;
            case 'auth/user-disabled':
                showError(emailInput, 'This account has been disabled.');
                break;
            case 'auth/user-not-found':
                showError(emailInput, 'No account found with this email.');
                break;
            case 'auth/wrong-password':
                showError(passwordInput, 'Incorrect password.');
                break;
            case 'auth/too-many-requests':
                showError(emailInput, 'Too many failed attempts. Please try again later.');
                break;
            default:
                showError(emailInput, 'An error occurred. Please try again');
        }
    }
});

// Google Sign In
if (googleSignInButton) {
    googleSignInButton.addEventListener('click', async () => {
        clearError(emailInput);
        clearError(passwordInput);
        try {
            await signInWithPopup(auth, googleProvider);
            window.location.href = '../home/home.html';
        } catch (error) {
            showError(emailInput, 'Google sign in failed. Please try again.');
        }
    });
}

// Check for remembered email
window.addEventListener('load', () => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMe.checked = true;
    }
});

// Add animation to the login card
document.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.querySelector('.login-card');
    loginCard.style.opacity = '0';
    loginCard.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        loginCard.style.transition = 'all 0.5s ease';
        loginCard.style.opacity = '1';
        loginCard.style.transform = 'translateY(0)';
    }, 100);
});

// Form validation
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');

// Email validation function
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Password validation function
function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return re.test(password);
}

// Real-time validation
emailInput.addEventListener('input', () => {
    if (emailInput.value.trim() === '') {
        emailError.textContent = 'Email is required';
    } else if (!validateEmail(emailInput.value)) {
        emailError.textContent = 'Please enter a valid email address';
    } else {
        emailError.textContent = '';
    }
});

passwordInput.addEventListener('input', () => {
    if (passwordInput.value.trim() === '') {
        passwordError.textContent = 'Password is required';
    } else if (!validatePassword(passwordInput.value)) {
        passwordError.textContent = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number';
    } else {
        passwordError.textContent = '';
    }
});