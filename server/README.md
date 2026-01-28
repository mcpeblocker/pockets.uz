# Pockets Backend API Server

Express.js backend server for the Pockets expense tracking application.

## Features

- JWT-based authentication
- SQLite3 database
- RESTful API endpoints
- File upload support for receipts
- Email notifications via Nodemailer

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
- `JWT_SECRET`: A secure random string for JWT signing
- `EMAIL_USER` and `EMAIL_PASS`: Gmail credentials for sending emails
- `DATABASE_PATH`: Path to SQLite database file (default: `./data/pockets.db`)

4. Run migrations (database will be created automatically):
```bash
npm run migrate
```

5. Start the server:
```bash
npm run dev  # Development mode with auto-reload
# or
npm start    # Production mode
```

The server will start on `http://localhost:3001` by default.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/signout` - Sign out

### Events
- `GET /api/events` - Get user's events (requires auth)
- `GET /api/events/:id` - Get event by ID
- `GET /api/events/slug/:slug` - Get event by slug
- `POST /api/events` - Create event (requires auth)
- `PUT /api/events/:id` - Update event (requires auth, owner only)
- `POST /api/events/:id/close` - Close event and calculate settlements (requires auth, owner only)
- `DELETE /api/events/:id` - Delete event (requires auth, owner only)

### Participants
- `GET /api/participants/event/:eventId` - Get participants for event
- `POST /api/participants/join` - Join event
- `POST /api/participants` - Add participant (requires auth, owner only)
- `PATCH /api/participants/:id/payment-status` - Update payment status
- `DELETE /api/participants/:id` - Delete participant (requires auth, owner only)
- `POST /api/participants/:id/leave` - Leave event

### Expenses
- `GET /api/expenses/event/:eventId` - Get expenses for event
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create expense (requires auth, supports file uploads)
- `PUT /api/expenses/:id` - Update expense (requires auth)
- `DELETE /api/expenses/:id` - Delete expense (requires auth, owner only)

### Settlements
- `GET /api/settlements/event/:eventId` - Get settlements for event

### Support
- `POST /api/support` - Send support message

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Database

The database is automatically initialized on first run. The schema includes:
- `users` - User accounts
- `events` - Expense events
- `participants` - Event participants
- `expenses` - Expenses
- `expense_splits` - Expense splitting details
- `receipts` - Receipt photos
- `settlements` - Settlement calculations

## File Uploads

Receipt photos are stored in the `uploads/` directory (configurable via `UPLOAD_DIR`). Files are served statically and should be accessible via the frontend.
