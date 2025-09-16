const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in your .env file.");
    process.exit(1);
}

app.post('/chat', async (req, res) => {
    const userPrompt = req.body.prompt;

    if (!userPrompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const lowerCasePrompt = userPrompt.toLowerCase();
    const introTriggers = [
        'introduce yourself',
        'who are you',
        'what is your name',
        "what's your name",
        'who made you',
        'who developed you',
        'who created you'
    ];

    const isIntroQuestion = introTriggers.some(trigger => lowerCasePrompt.includes(trigger));

    if (isIntroQuestion) {
        const customResponse = "my name is love and iam developed by pv hareesh";
        return res.json({ response: customResponse });
    }

    try {
        // --- THIS LINE IS UPDATED ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            const errorMsg = data?.error?.message || 'Failed to get response from Gemini API.';
            return res.status(response.status).json({ error: errorMsg });
        }
        
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        res.json({ response: botResponse });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});