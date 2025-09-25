// **UPDATED: Added API Base URL**
const API_BASE_URL = 'https://ai-chatbot-api-7muc.onrender.com';

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. "GET STARTED" BUTTON LOGIC ---
    const welcomeSection = document.getElementById('welcome-section');
    const loginSection = document.getElementById('login-section');
    const getStartedBtn = document.getElementById('get-started-btn');

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', async () => {
            try {
                // Check if the user is already logged in
                // **UPDATED: Using full API URL**
                const response = await fetch(`${API_BASE_URL}/api/user`, { credentials: 'include' });
                const data = await response.json();

                if (data.loggedIn) {
                    // If logged in, go directly to the chat page
                    window.location.href = '/chat.html';
                } else {
                    // If not logged in, show the login/signup forms
                    welcomeSection.classList.add('hidden');
                    document.getElementById('features').classList.add('hidden');
                    loginSection.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                // Fallback to showing the login form if the check fails
                welcomeSection.classList.add('hidden');
                document.getElementById('features').classList.add('hidden');
                loginSection.classList.remove('hidden');
            }
        });
    }
    
    // Also update the Google Login Link in index.html
    const googleLoginLink = document.querySelector('a[href="/auth/google"]');
    if (googleLoginLink) {
        googleLoginLink.href = `${API_BASE_URL}/auth/google`;
    }

    // --- 2. EXISTING FORM LOGIC ---
    // Form Toggling Logic
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const toggleToSignupLink = document.getElementById('toggle-to-signup');
    const toggleToSigninLink = document.getElementById('toggle-to-signin');
    const toggleToSignupText = document.getElementById('toggle-to-signup-text');
    const toggleToSigninText = document.getElementById('toggle-to-signin-text');

    if (toggleToSignupLink) {
        toggleToSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            signinForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            toggleToSignupText.classList.add('hidden');
            toggleToSigninText.classList.remove('hidden');
        });
    }

    if (toggleToSigninLink) {
        toggleToSigninLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.add('hidden');
            signinForm.classList.remove('hidden');
            toggleToSigninText.classList.add('hidden');
            toggleToSignupText.classList.remove('hidden');
        });
    }

    // Form Submission Logic
    const errorBanner = document.getElementById('error-banner');

    const showError = (message) => {
        errorBanner.textContent = message;
        errorBanner.classList.remove('hidden');
    };

    const hideError = () => {
        errorBanner.classList.add('hidden');
    };

    // --- Signup Form Handler ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();
            const firstName = document.getElementById('signup-firstname').value;
            const lastName = document.getElementById('signup-lastname').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            if (password !== confirmPassword) {
                showError("Passwords do not match.");
                return;
            }
            try {
                // **UPDATED: Using full API URL**
                const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, lastName, email, password }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Signup failed.');
                }
                window.location.href = '/chat.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // --- Signin Form Handler ---
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            try {
                // **UPDATED: Using full API URL**
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Login failed.');
                }
                window.location.href = '/chat.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }
});