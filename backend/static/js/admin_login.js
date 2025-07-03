// DOM Elements
const adminLoginForm = document.getElementById('adminLoginForm');
const errorMessage = document.getElementById('error-message');

// Admin credentials
const ADMIN_EMAIL = 'Admin@123';
const ADMIN_PASSWORD = 'Admin@123';

// Admin login handler
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        // Check for admin credentials
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            window.location.href = '../dashboard/dashboard.html';
        } else {
            showError('Invalid admin credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred. Please try again.');
    }
});

function showError(message) {
    errorMessage.textContent = message;
} 