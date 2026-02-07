import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import pool from '../db';
import { User } from '../../../shared/src/types';

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'dummy_secret',
      callbackURL: process.env.CALLBACK_URL || 'http://localhost:5000/api/auth/microsoft/callback',
      scope: ['user.read'],
      tenant: process.env.MICROSOFT_TENANT_ID || 'common',
    },
    async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
      try {
        const microsoftId = profile.id;
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        let displayName = profile.displayName || `User_${microsoftId.substring(0, 8)}`;

        if (!email) {
            return done(new Error("No email found in Microsoft profile"), null);
        }

        // 1. Check if user exists by microsoft_id
        const existingUserResult = await pool.query(
          'SELECT * FROM users WHERE microsoft_id = $1',
          [microsoftId]
        );

        if (existingUserResult.rows.length > 0) {
          return done(null, existingUserResult.rows[0]);
        }

        // 2. Check if user exists by email (Account Linking)
        const emailUserResult = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (emailUserResult.rows.length > 0) {
            // Update existing user with microsoft_id
            const updatedUser = await pool.query(
                'UPDATE users SET microsoft_id = $1 WHERE email = $2 RETURNING *',
                [microsoftId, email]
            );
            return done(null, updatedUser.rows[0]);
        }

        // 3. Create new user
        // Generate a random unused password hash (since they use Microsoft login)
        const newUserResult = await pool.query(
          `INSERT INTO users (
            username, email, password_hash, microsoft_id, is_verified, avatar
          ) VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
          [
            displayName  + '_' + Math.random().toString(36).substring(7), // Ensure unique username
            email, 
            null, // No password
            microsoftId,
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName)
          ]
        );

        return done(null, newUserResult.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
