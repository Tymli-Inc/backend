import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import sql from './database/db.js';
import { v4 as uuidv4 } from 'uuid';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // generate a unique code token
    const code = uuidv4();
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const name = profile.displayName;

    const result = await sql`
      SELECT * FROM users WHERE google_id = ${googleId}
    `;

    let user;

    if (result.length === 0) {
      // insert new user with code
      const inserted = await sql`
        INSERT INTO users (google_id, email, name, code)
        VALUES (${googleId}, ${email}, ${name}, ${code})
        RETURNING *
      `;
      user = inserted[0];
    } else {
      // update existing user's code
      const existingUser = result[0];
      const updated = await sql`
        UPDATE users SET code = ${code} WHERE id = ${existingUser.id} RETURNING *
      `;
      user = updated[0];
    }

    return done(null, user);
  } catch (err) {
    console.error('Error during Google authentication:', err);
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    done(null, result[0]);
  } catch (err) {
    done(err, null);
  }
});
