// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';

// Firebase configuration
const firebaseConfig = {
    // Your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '../login/index.html';
    }
});

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Initialize charts
function initializeCharts() {
    // Response Time Chart
    const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
    new Chart(responseTimeCtx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'Response Time (s)',
                data: [0.4, 0.5, 0.6, 0.5, 0.4, 0.5],
                borderColor: '#4CAF50',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(76, 175, 80, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Memory Usage Chart
    const memoryUsageCtx = document.getElementById('memoryUsageChart').getContext('2d');
    new Chart(memoryUsageCtx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'Memory Usage (%)',
                data: [40, 45, 50, 45, 40, 45],
                borderColor: '#2196F3',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(33, 150, 243, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Time range change handler
const timeRange = document.getElementById('timeRange');
timeRange.addEventListener('change', (e) => {
    // Update charts based on selected time range
    console.log('Time range changed:', e.target.value);
    // Here you would typically fetch new data and update the charts
});

// Refresh models button handler
const refreshModels = document.getElementById('refreshModels');
refreshModels.addEventListener('click', () => {
    // Simulate refreshing model status
    refreshModels.disabled = true;
    refreshModels.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    
    setTimeout(() => {
        refreshModels.disabled = false;
        refreshModels.innerHTML = '<i class="fas fa-sync"></i> Refresh Status';
        // Here you would typically update the model status with real data
    }, 2000);
});

// View all alerts button handler
const viewAllAlerts = document.getElementById('viewAllAlerts');
viewAllAlerts.addEventListener('click', () => {
    // Here you would typically navigate to a full alerts page
    console.log('View all alerts clicked');
});

// Logout button handler
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../login/index.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

// Initialize charts when the page loads
document.addEventListener('DOMContentLoaded', initializeCharts);

// Load sidebar component
document.addEventListener('DOMContentLoaded', function() {
    fetch('../components/sidebar.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;
            // Set active nav-item
            const path = window.location.pathname;
            document.querySelectorAll('.nav-item').forEach(link => {
                link.classList.remove('active');
                if ((path.includes('dashboard') && link.dataset.section === 'users') ||
                    (path.includes('ai-status') && link.dataset.section === 'ai')) {
                    link.classList.add('active');
                }
            });
            // Attach logout event
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    window.location.href = '/admin/login/login.html';
                });
            }
        });
}); 