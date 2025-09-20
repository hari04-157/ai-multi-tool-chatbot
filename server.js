const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

const app = express();
const port = process.env.PORT || 3000;

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- User Schema and Model ---
const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true },
    profilePicture: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// --- CORS Configuration for Live Site ---
const allowedOrigins = [
    'https://ai-multi-tool-chatbot.netlify.app', // UPDATED to https
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// --- Session Configuration ---
app.set('trust proxy', 1);
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname)));

// --- Passport.js Configuration ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://ai-chatbot-api-7muc.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        } else {
            const newUser = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value,
                profilePicture: profile.photos[0].value
            });
            await newUser.save();
            return done(null, newUser);
        }
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// --- API and Authentication Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'https://ai-multi-tool-chatbot.netlify.app' }), (req, res) => {
    // UPDATED to https
    res.redirect('https://ai-multi-tool-chatbot.netlify.app/chat.html');
});

app.get('/auth/logout', (req, res, next) => {
    // UPDATED to https
    const frontendUrl = 'https://ai-multi-tool-chatbot.netlify.app';
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect(frontendUrl);
        });
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ loggedIn: true, user: { name: req.user.displayName } });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- Middleware to Protect Page Routes ---
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    // UPDATED to https
    res.redirect('https://ai-multi-tool-chatbot.netlify.app');
}

app.get('/chat.html', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// --- Main Chat Endpoint ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

app.post('/chat', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const userPrompt = req.body.prompt;
    if (!userPrompt) return res.status(400).json({ error: 'Prompt is required' });

    const lowerCasePrompt = userPrompt.toLowerCase();
    const introTriggers = ['introduce yourself', 'who are you', 'what is your name', "what's your name", 'who made you', 'who developed you', 'who created you'];
    
    if (introTriggers.some(trigger => lowerCasePrompt.includes(trigger))) {
        const customResponse = "My name is Rocky. I was developed by P.V. Hareesh (Reg. No: 2373A05196), a 3rd-year B.Tech CSE student from the 2024-2027 batch at PBR Visvodaya Institute of Technology & Science, Kavali. This project was completed under the guidance of Madhuri Madam.";
        return res.json({ type: 'text', data: customResponse });
    }

    try {
        const routingPrompt = `Is the user asking to generate an image, picture, or photo? Respond with a JSON object only, either {"type": "image", "prompt": "the subject for the image"} OR {"type": "text", "prompt": "the original question"}. User question: "${userPrompt}"`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        const routingResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: routingPrompt }] }] }),
        });
        if (!routingResponse.ok) throw new Error('Failed to get a response from the routing AI.');
        
        const routingData = await routingResponse.json();
        const geminiResponseText = routingData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!geminiResponseText) throw new Error("The AI router returned an empty response.");
        
        const jsonMatch = geminiResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("The AI router gave an invalid response format.");
        
        const intent = JSON.parse(jsonMatch[0]);

        if (intent.type === 'image') {
            const imageBase64 = await generateImageWithStability(intent.prompt);
            res.json({ type: 'image', data: imageBase64 });
        } else {
            const textResponse = await generateTextWithGemini(intent.prompt);
            res.json({ type: 'text', data: textResponse });
        }
    } catch (error) {
        console.error('Server Error in /chat endpoint:', error);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

// --- Helper Functions ---
async function generateTextWithGemini(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to get text response from Gemini API.');
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response.";
}

async function generateImageWithStability(prompt) {
    if (!STABILITY_API_KEY) throw new Error('Stability AI API key not configured.');
    const engineId = 'stable-diffusion-xl-1024-v1-0';
    const apiHost = 'https://api.stability.ai';
    const apiUrl = `${apiHost}/v1/generation/${engineId}/text-to-image`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${STABILITY_API_KEY}` },
        body: JSON.stringify({ text_prompts: [{ text: prompt }], cfg_scale: 7, height: 1024, width: 1024, steps: 30, samples: 1 }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Stability API Error:', errorText);
        throw new Error('Failed to get image from Stability API.');
    }
    const data = await response.json();
    return data.artifacts[0].base64;
}

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});