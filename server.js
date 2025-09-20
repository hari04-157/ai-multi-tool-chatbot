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
const port = process.env.PORT || 3000; // Use port from environment or default to 3000

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
    'https://ai-multi-tool-chatbot.netlify.app',
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
app.set('trust proxy', 1); // Trust first proxy for secure cookies
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: true, // Required for cross-site cookies
        sameSite: 'none', // Required for cross-site cookies
        maxAge: 1000 * 60 * 60 * 24 // 1 day
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
    res.redirect('https://ai-multi-tool-chatbot.netlify.app/chat.html');
});

// The logout route is hit by the browser, so it's a simple API call
app.get('/auth/logout', (req, res, next) => {
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

// --- Main Chat Endpoint & Helper Functions remain the same ---
// ...

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});