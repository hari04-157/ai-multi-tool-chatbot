document.addEventListener('DOMContentLoaded', async () => {
    const authContainer = document.getElementById('auth-container');
    const errorBanner = document.getElementById('error-banner');

    const API_BASE_URL = 'https://ai-chatbot-api-7muc.onrender.com';

    // Update the login link to point to the Render server
    authContainer.querySelector('a').href = `${API_BASE_URL}/auth/google`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, { credentials: 'include' });

        if (!response.ok) {
            throw new Error(`Network response was not ok (${response.status})`);
        }

        const data = await response.json();

        if (data.loggedIn) {
            authContainer.innerHTML = `
                <p class="mb-4 text-xl">Welcome back, ${data.user.name}!</p>
                <a href="/chat.html" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                    Go to Chat
                </a>
            `;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        errorBanner.classList.remove('hidden');
        errorBanner.textContent = 'Could not connect to the server. Please check the server status.';
    }
});