const API_BASE_URL = 'https://ai-chatbot-api-7muc.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const welcomeSection = document.getElementById('welcome-section');
    const loginSection = document.getElementById('login-section');
    const getStartedBtn = document.getElementById('get-started-btn');
    const googleLoginLink = document.querySelector('a[href="/auth/google"]');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const toggleToSignupLink = document.getElementById('toggle-to-signup');
    const toggleToSigninLink = document.getElementById('toggle-to-signin');
    const toggleToSignupText = document.getElementById('toggle-to-signup-text');
    const toggleToSigninText = document.getElementById('toggle-to-signin-text');
    const errorBanner = document.getElementById('error-banner');

    if (googleLoginLink) {
        googleLoginLink.href = `${API_BASE_URL}/auth/google`;
    }

    const showError = (message) => {
        errorBanner.textContent = message;
        errorBanner.classList.remove('hidden');
    };

    const hideError = () => {
        errorBanner.classList.add('hidden');
    };

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/user`, { credentials: 'include' });
                const data = await response.json();
                if (data.loggedIn) {
                    window.location.href = '/chat.html';
                } else {
                    welcomeSection.classList.add('hidden');
                    document.getElementById('features').classList.add('hidden');
                    loginSection.classList.remove('hidden');
                }
            } catch (error) {
                welcomeSection.classList.add('hidden');
                document.getElementById('features').classList.add('hidden');
                loginSection.classList.remove('hidden');
            }
        });
    }

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

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            if (password !== confirmPassword) {
                return showError("Passwords do not match.");
            }
            try {
                const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName: document.getElementById('signup-firstname').value,
                        lastName: document.getElementById('signup-lastname').value,
                        email: document.getElementById('signup-email').value,
                        password: password
                    }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Signup failed.');
                window.location.href = '/chat.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }

    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('signin-email').value,
                        password: document.getElementById('signin-password').value
                    }),
                    credentials: 'include'
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Invalid email or password.' }));
                    throw new Error(errorData.message);
                }
                window.location.href = '/chat.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }
});