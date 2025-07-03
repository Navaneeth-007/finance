// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
import { initializeThemeManager, setupThemeToggle } from '../shared/theme-manager.js';
import { auth } from "./firebase-config.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDqXpYwQZQZQZQZQZQZQZQZQZQZQZQZQZQ",
    authDomain: "smartfin-12345.firebaseapp.com",
    projectId: "smartfin-12345",
    storageBucket: "smartfin-12345.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:1234567890123456789012"
};

const app = initializeApp(firebaseConfig);
const authInstance = getAuth(app);

// --- Simple Notification Logic ---
async function updateNotifications() {
    const notificationList = document.querySelector('.notification-list');
    const notificationBadge = document.querySelector('.notification-badge');
    if (!notificationList || !notificationBadge) return;
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        notificationList.innerHTML = `<div class="empty-notifications"><i class="fas fa-bell-slash"></i><p>No notifications yet</p></div>`;
        notificationBadge.style.display = 'none';
        return;
    }
    const uid = user.uid;
    // Get current month/year
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    // Fetch budget and expenses
    let budget = 0;
    let totalExpenses = 0;
    try {
        const resBudget = await fetch(`http://127.0.0.1:5000/api/budget/${uid}`);
        if (resBudget.ok) {
            const data = await resBudget.json();
            budget = data.amount;
        }
        const resExp = await fetch(`http://127.0.0.1:5000/api/expenses/${uid}?month=${month}&year=${year}`);
        if (resExp.ok) {
            const data = await resExp.json();
            totalExpenses = data.reduce((sum, e) => sum + Number(e.amount), 0);
        }
    } catch (err) {}
    console.log('Budget:', budget, 'Total Expenses:', totalExpenses);
    // Show notification if needed
    if (budget && totalExpenses > budget) {
        notificationList.innerHTML = `
            <div class="notification-item unread">
                <div class="notification-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="notification-content">
                    <h4>Expense Exceeded Budget</h4>
                    <p>Expense exceeded current month budget.</p>
                    <span class="notification-time">Just now</span>
                </div>
            </div>
        `;
        notificationBadge.textContent = '1';
        notificationBadge.style.display = 'flex';
    } else {
        notificationList.innerHTML = `<div class="empty-notifications"><i class="fas fa-bell-slash"></i><p>No notifications yet</p></div>`;
        notificationBadge.style.display = 'none';
    }
}
window.updateNotifications = updateNotifications;

// --- Minimal Navbar Logic ---
function updateActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (currentPath.includes(link.getAttribute('data-page'))) {
            link.classList.add('active');
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    initializeThemeManager();
    setupThemeToggle();
    updateActiveNavLink();

    const notificationButton = document.querySelector('.notification-button');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    if (notificationButton && notificationDropdown) {
        notificationButton.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
        });
    }
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-container')) {
            if (notificationDropdown) {
                notificationDropdown.classList.remove('show');
            }
        }
    });

    const profileNavBtn = document.getElementById('profile-nav-btn');
    const profileName = document.querySelector('.profile-name');
    if (profileNavBtn) {
        profileNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/profile/profile.html';
        });
    }
});
