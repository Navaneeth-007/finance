import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDXK-0FKH1hC-LiEASaIWolvxqk-2MnbWI",
    authDomain: "smartfin-40e30.firebaseapp.com",
    projectId: "smartfin-40e30",
    storageBucket: "smartfin-40e30.appspot.com",
    messagingSenderId: "14976464670",
    appId: "1:14976464670:web:98756ac774dc67b3613b0f",
    measurementId: "G-S5XWF0BNPJ"
  };

// Validate Firebase config
function validateFirebaseConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required Firebase configuration fields: ${missingFields.join(', ')}`);
    }
    
    if (!config.apiKey.startsWith('AIza')) {
        throw new Error('Invalid Firebase API key format');
    }
}

// Initialize Firebase with error handling
let app;
let auth;
let googleProvider;

try {
    // Validate config before initialization
    validateFirebaseConfig(firebaseConfig);
    
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Initialize Google Auth Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
        prompt: 'select_account'
    });
    
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
    // Re-throw the error to be handled by the calling code
    throw error;
}

// Debug function to check Firebase status
function checkFirebaseStatus() {
    console.log('Firebase app initialized:', !!app);
    console.log('Firebase auth available:', !!auth);
    console.log('Google provider initialized:', !!googleProvider);
    console.log('Current configuration:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
    });
}

// Call the debug function
checkFirebaseStatus();

export { app, auth, googleProvider }; 