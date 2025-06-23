import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import sql from './database/db.js';
import { v4 as uuidv4, v6 } from 'uuid';
import { processUserImage } from './utils/imageHandler.js';

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

    const googleProfileImage = profile.photos ? profile.photos[0].value : null;
    const googleId = profile.id;
    const name = profile.displayName;
    
    const result = await sql`
      SELECT * FROM users WHERE google_id = ${googleId}
    `;

    let user;

    if (result.length === 0) {
      // Process the image (upload to Cloudinary or generate fallback)
      const processedImageUrl = await processUserImage(googleProfileImage, name, googleId);
      
      const inserted = await sql`
        INSERT INTO users (google_id, email, name, code, image)
        VALUES (${googleId}, ${email}, ${name}, ${code}, ${processedImageUrl})
        RETURNING *
      `;
      user = inserted[0];
    } else {
      // update existing user's code and potentially update image
      const existingUser = result[0];
      
      // Process the image if it has changed or if there's no existing image
      let imageUrl = existingUser.image;
      if (!existingUser.image || (googleProfileImage && googleProfileImage !== existingUser.image)) {
        imageUrl = await processUserImage(googleProfileImage, name, existingUser.id);
      }
      
      const updated = await sql`
        UPDATE users SET code = ${code}, image = ${imageUrl} WHERE id = ${existingUser.id} RETURNING *
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
