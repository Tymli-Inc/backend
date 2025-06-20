import express from "express";
import cors from "cors";
import './passport.js'
import session from 'express-session';
import passport from 'passport';

const app = express();

app.use(cors({
    origin: '*', 
    credentials: true
}));

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes Import
import healthcheckRoutes from "./routes/healthcheck.routes.js";

// Routes Declaration
app.use("/api/v1/healthcheck", healthcheckRoutes);


// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    successRedirect: '/dashboard'
  })
);

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

export { app };