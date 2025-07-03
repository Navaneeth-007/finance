document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) {
        document.getElementById('nav-users').classList.add('active');
    } else if (path.includes('ai-status')) {
        document.getElementById('nav-ai').classList.add('active');
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.location.href = '/admin/login/login.html';
        });
    }
}); 