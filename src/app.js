import express from "express";
import cors from "cors";
import './passport.js'
import session from 'express-session';
import passport from 'passport';
import sql from './database/db.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: '*', 
    credentials: true
}));

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes Import
import healthcheckRoutes from "./routes/healthcheck.routes.js";
import userRoutes from "./routes/user.routes.js";

// Routes Declaration
app.use("/api/v1/healthcheck", healthcheckRoutes);
app.use("/api/v1/user", userRoutes);

app.get('/redirect.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/redirect.html'));
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login');
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect(`/redirect.html?code=${user.code}`);
    });
  })(req, res, next);
});

app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');
  res.send(`Welcome ${req.user.name}`);
});

app.get('/login', (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});

app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// Exchange code for token
app.post('/auth/token', async (req, res, next) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  try {
    const users = await sql`SELECT * FROM users WHERE code = ${code}`;
    if (users.length === 0) return res.status(400).json({ error: 'Invalid code' });
    const user = users[0];
    const token = crypto.randomBytes(48).toString('hex');

    const result = await sql`
      select * from tokens
      WHERE user_id = ${user.id}
    `;
    if (result.length > 0) {
      await sql`
        UPDATE tokens
        SET token = ${token}
        WHERE user_id = ${user.id}
      `;
    }else {
      await sql`
        INSERT INTO tokens (user_id, token)
        VALUES (${user.id}, ${token})
      `;
    }
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

export { app };