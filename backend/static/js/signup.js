// Import theme configuration
import { initializeTheme } from '../shared/theme-config.js';
import { auth, googleProvider } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithPopup,
    updateProfile 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// DOM Elements
const signupForm = document.getElementById('signup-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const googleSignUpButton = document.getElementById('google-signup');

// Error elements
const nameError = document.getElementById('name-error');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const confirmPasswordError = document.getElementById('confirm-password-error');

// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();

    // Password Toggle Functionality
    const togglePassword = document.getElementById('toggle-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    
    // Password field toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle the eye icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Confirm password field toggle
    if (toggleConfirmPassword && confirmPasswordInput) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            // Toggle the eye icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
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
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    // Clear errors
    clearError(nameInput);
    clearError(emailInput);
    clearError(passwordInput);
    clearError(confirmPasswordInput);
    // Validate
    if (!name) {
        showError(nameInput, 'Name is required');
        return;
    }
    if (!email) {
        showError(emailInput, 'Email is required');
        return;
    }
    if (!password) {
        showError(passwordInput, 'Password is required');
        return;
    }
    if (password !== confirmPassword) {
        showError(confirmPasswordInput, 'Passwords do not match');
        return;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        window.location.href = '../home/home.html';
    } catch (error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                showError(emailInput, 'Email already in use');
                break;
            case 'auth/invalid-email':
                showError(emailInput, 'Invalid email address');
                break;
            case 'auth/weak-password':
                showError(passwordInput, 'Password should be at least 6 characters');
                break;
            default:
                showError(emailInput, 'An error occurred. Please try again');
        }
    }
});

// Google Sign Up
if (googleSignUpButton) {
    googleSignUpButton.addEventListener('click', async () => {
        clearError(nameInput);
        clearError(emailInput);
        clearError(passwordInput);
        clearError(confirmPasswordInput);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            window.location.href = '../home/home.html';
        } catch (error) {
            showError(emailInput, 'Google sign up failed. Please try again.');
        }
    });
}

// Add animation to the signup card
document.addEventListener('DOMContentLoaded', () => {
    const signupCard = document.querySelector('.signup-card');
    signupCard.style.opacity = '0';
    signupCard.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        signupCard.style.transition = 'all 0.5s ease';
        signupCard.style.opacity = '1';
        signupCard.style.transform = 'translateY(0)';
    }, 100);
}); 