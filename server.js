const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const port = 3000;

mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    firstName: { type: String },
    lastName: { type: String },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    displayName: { type: String },
    profilePicture: { type: String },
    createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors({
    origin: 'https://ai-multi-tool-chatbot.netlify.app',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        httpOnly: true,
        sameSite: 'none'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://ai-chatbot-api-7muc.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        let existingUser = await User.findOne({ email: profile.emails[0].value });
        if (existingUser) {
            existingUser.googleId = profile.id;
            existingUser.displayName = existingUser.displayName || profile.displayName;
            existingUser.profilePicture = existingUser.profilePicture || profile.photos[0].value;
            await existingUser.save();
            return done(null, existingUser);
        }

        const newUser = new User({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value.toLowerCase(),
            profilePicture: profile.photos[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName
        });
        await newUser.save();
        return done(null, newUser);
    } catch (err) {
        return done(err, null);
    }
}));

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return done(null, false, { message: 'No user with that email.' });
        if (!user.password) return done(null, false, { message: 'Please log in with Google.' });
        
        const isMatch = await user.comparePassword(password);
        if (isMatch) return done(null, user);
        
        return done(null, false, { message: 'Password incorrect.' });
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

app.post('/auth/signup', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        if (await User.findOne({ email: email.toLowerCase() })) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }
        const newUser = new User({ firstName, lastName, email: email.toLowerCase(), password, displayName: `${firstName} ${lastName}` });
        await newUser.save();
        req.login(newUser, (err) => {
            if (err) return res.status(500).json({ message: 'Session could not be established.' });
            res.status(201).json({ message: 'User created successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during signup.' });
    }
});

app.post('/auth/login', passport.authenticate('local'), (req, res) => {
    res.status(200).json({ message: 'Logged in successfully' });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: 'https://ai-multi-tool-chatbot.netlify.app/chat.html',
    failureRedirect: 'https://ai-multi-tool-chatbot.netlify.app/'
}));

app.get('/auth/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) return next(err);
        res.redirect('https://ai-multi-tool-chatbot.netlify.app/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'User not authenticated' });
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

app.post('/chat', ensureAuthenticated, upload.single('file'), async (req, res) => {
    const userPrompt = req.body.prompt || "";
    const file = req.file;

    if (!userPrompt && !file) {
        return res.status(400).json({ error: 'Prompt or file is required' });
    }
    
    // ... (rest of your chat logic)
});

// ... (rest of your helper functions)

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});