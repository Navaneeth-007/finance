import { auth } from "./firebase-config.js";
import { signOut, updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const profileImage = document.getElementById('profile-image');
    const profileInitial = document.getElementById('profile-initial');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');

    // Modal elements
    const editProfileModal = document.getElementById('edit-profile-modal');
    const changePasswordModal = document.getElementById('change-password-modal');
    const editProfileBtn = document.getElementById('edit-profile');
    const changePasswordBtn = document.getElementById('change-password');
    const closeEditProfile = document.getElementById('close-edit-profile');
    const closeChangePassword = document.getElementById('close-change-password');
    const cancelEditProfile = document.getElementById('cancel-edit-profile');
    const cancelChangePassword = document.getElementById('cancel-change-password');
    const editProfileForm = document.getElementById('edit-profile-form');
    const changePasswordForm = document.getElementById('change-password-form');

    // Open/close modals
    editProfileBtn.addEventListener('click', () => { editProfileModal.style.display = 'block'; });
    changePasswordBtn.addEventListener('click', () => {
        // Check if user is Google sign-in
        let isGoogleUser = false;
        if (currentUser && currentUser.providerData) {
            isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
        }
        const note = document.getElementById('change-password-note');
        if (isGoogleUser) {
            note.style.display = 'block';
            changePasswordForm.style.display = 'none';
        } else {
            note.style.display = 'none';
            changePasswordForm.style.display = 'block';
        }
        changePasswordModal.style.display = 'block';
    });
    closeEditProfile.addEventListener('click', () => { editProfileModal.style.display = 'none'; });
    closeChangePassword.addEventListener('click', () => { changePasswordModal.style.display = 'none'; });
    cancelEditProfile.addEventListener('click', () => { editProfileModal.style.display = 'none'; });
    cancelChangePassword.addEventListener('click', () => { changePasswordModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target === editProfileModal) editProfileModal.style.display = 'none';
        if (e.target === changePasswordModal) changePasswordModal.style.display = 'none';
    });

    // Populate edit profile form with current values
    let currentUser = null;
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            const displayName = user.displayName || user.email.split('@')[0];
            const initial = displayName.charAt(0).toUpperCase();
            profileName.textContent = displayName;
            profileEmail.textContent = user.email;
            document.getElementById('edit-username').value = displayName;
            document.getElementById('edit-email').value = user.email;
            if (user.photoURL) {
                profileImage.src = user.photoURL;
                profileImage.style.display = 'block';
                profileInitial.style.display = 'none';
            } else {
                profileInitial.textContent = initial;
                profileInitial.style.display = 'block';
                profileImage.style.display = 'none';
            }
        } else {
            window.location.href = '/login/login.html';
        }
    });

    // Edit Profile Form Submission
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('edit-username').value.trim();
        const newEmail = document.getElementById('edit-email').value.trim();
        try {
            if (currentUser.displayName !== newName) {
                await updateProfile(currentUser, { displayName: newName });
            }
            if (currentUser.email !== newEmail) {
                await updateEmail(currentUser, newEmail);
            }
            alert('Profile updated successfully!');
            editProfileModal.style.display = 'none';
            location.reload();
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    });

    // Change Password Form Submission
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match.');
            return;
        }
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);
            alert('Password updated successfully!');
            changePasswordModal.style.display = 'none';
            changePasswordForm.reset();
        } catch (error) {
            alert('Error changing password: ' + error.message);
        }
    });

    document.getElementById('logout').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = '/login/login.html';
    });
}); 