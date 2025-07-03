// DOM Elements
const userList = document.querySelector('.users-grid');
const logoutBtn = document.getElementById('logoutBtn');
const userSearch = document.getElementById('userSearch');

// Add User Modal Logic
const addUserBtn = document.getElementById('addUserBtn');
const addUserModal = document.getElementById('addUserModal');
const closeAddUserModal = document.getElementById('closeAddUserModal');
const addUserForm = document.getElementById('addUserForm');
const addUserError = document.getElementById('addUserError');

// Validate admin session
if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = '/admin/login/login.html';
}

// Fetch and display users from backend
async function loadUsers() {
    try {
        const res = await fetch('http://127.0.0.1:5000/admin/list-users');
        const users = await res.json();
        userList.innerHTML = '';
        if (Array.isArray(users) && users.length > 0) {
            // Create table
            const table = document.createElement('table');
            table.className = 'user-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Joined Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');
            users.forEach(user => {
                const row = document.createElement('tr');
                const isDisabled = user.disabled;
                row.innerHTML = `
                    <td>${user.displayName || 'No name'}</td>
                    <td>${user.email || 'No email'}</td>
                    <td>${user.createdAt || 'N/A'}</td>
                    <td>
                        <button class="delete-user-btn" data-uid="${user.uid}">Delete</button>
                        <button class="change-password-btn" data-uid="${user.uid}">Change Password</button>
                        <button class="toggle-disable-btn" data-uid="${user.uid}">${isDisabled ? 'Enable' : 'Disable'}</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            userList.appendChild(table);

            // Add delete event listeners
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const uid = btn.getAttribute('data-uid');
                    if (confirm('Are you sure you want to delete this user?')) {
                        await deleteUser(uid);
                        loadUsers(); // Refresh list
                    }
                });
            });

            // Add change password event listeners
            document.querySelectorAll('.change-password-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const uid = btn.getAttribute('data-uid');
                    const newPassword = prompt('Enter new password for this user:');
                    if (newPassword && newPassword.length >= 6) {
                        await changeUserPassword(uid, newPassword);
                        alert('Password changed successfully.');
                    } else if (newPassword) {
                        alert('Password must be at least 6 characters.');
                    }
                });
            });

            // Add disable/enable event listeners
            document.querySelectorAll('.toggle-disable-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const uid = btn.getAttribute('data-uid');
                    const action = btn.textContent === 'Disable' ? 'disable' : 'enable';
                    await toggleUserDisabled(uid, action === 'disable');
                    loadUsers();
                });
            });
        } else {
            userList.innerHTML = '<p>No users found.</p>';
        }
    } catch (err) {
        console.error('Error loading users:', err);
        userList.innerHTML = '<p>Error fetching users.</p>';
    }
}

// Delete user function
async function deleteUser(uid) {
    try {
        const res = await fetch(`http://127.0.0.1:5000/admin/delete-user/${uid}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) {
            alert('Failed to delete user.');
        }
    } catch (err) {
        alert('Error deleting user.');
    }
}

// Change user password function
async function changeUserPassword(uid, newPassword) {
    try {
        const res = await fetch(`http://127.0.0.1:5000/admin/change-password/${uid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword })
        });
        const data = await res.json();
        if (!data.success) {
            alert('Failed to change password.');
        }
    } catch (err) {
        alert('Error changing password.');
    }
}

// Toggle user disabled status
async function toggleUserDisabled(uid, disabled) {
    try {
        const res = await fetch(`http://127.0.0.1:5000/admin/toggle-disable/${uid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disabled })
        });
        const data = await res.json();
        if (!data.success) {
            alert('Failed to update user status.');
        }
    } catch (err) {
        alert('Error updating user status.');
    }
}

// Run on load
loadUsers();

// Logout
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = '/admin/login/login.html';
});

// Add User Modal Logic
addUserBtn.addEventListener('click', () => {
    addUserModal.style.display = 'block';
    addUserError.textContent = '';
    addUserForm.reset();
});
closeAddUserModal.addEventListener('click', () => {
    addUserModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target === addUserModal) {
        addUserModal.style.display = 'none';
    }
});

addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addUserError.textContent = '';
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    try {
        const res = await fetch('http://127.0.0.1:5000/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (data.success) {
            addUserModal.style.display = 'none';
            loadUsers();
        } else {
            addUserError.textContent = data.error || 'Failed to create user.';
        }
    } catch (err) {
        addUserError.textContent = 'Error creating user.';
    }
});

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