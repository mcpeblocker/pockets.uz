# Pockets - Shared Expense Tracking App

**Make it extremely easy for willing people to share expenses transparently and settle them.**

Pockets is a modern web application that simplifies group expense management. No registration required to participate—just share a link and start tracking expenses!

## 👥 Authors

This project was created and developed by:

- **Alisher Ortiqov** ([@mcpeblocker](https://github.com/mcpeblocker))
- **Kamoliddin Yulbarsov** ([@KamoliddinCS](https://github.com/KamoliddinCS))

## 🌟 Features

- **No Registration Required**: Participants can join events and view expenses without creating an account
- **Smart Split Calculation**: Automatically divides expenses equally among participants
- **Minimized Settlements**: Uses an algorithm to minimize the number of transactions needed
- **Multi-Currency Support**: Support for USD, EUR, GBP, JPY, KRW, CNY, INR, AUD, CAD, CHF and more
- **Email Notifications**: Automatic personalized settlement emails when events close
- **Join/Leave Functionality**: Participants can leave events before they close (if they have no expenses)
- **Payment Tracking**: Mark payments as paid or pending
- **Mobile-First Design**: Responsive and accessible on all devices
- **Real-time Updates**: See expenses and participants update instantly

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Express.js (Node.js)
- **Database**: SQLite (via `server/` API)
- **Authentication**: JWT (email + password, email verification)
- **Email**: Nodemailer (Gmail SMTP)
- **Notifications**: Telegram Bot API (optional, for support)

## 📋 Prerequisites

- Node.js 18+ and npm
- Gmail account for SMTP (with App Password)
- Telegram Bot (optional, for support notifications to admin)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mcpeblocker/pockets.uz.git
cd pockets.uz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Frontend
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com

# Telegram Bot Configuration (Optional - for support messages only)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_ID=your_telegram_chat_id
```

### 4. Start the Backend API (Express + SQLite)

```bash
cd server
npm install
npm run migrate
npm run dev
```

The backend will run at `http://localhost:3001`.

### 5. Configure Email (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Create a new app password
3. Add the app password to `.env` as `EMAIL_PASS`

### 6. Set Up Telegram Bot (Optional)

**Note**: Telegram is now optional and only used for support messages to admin.

1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Copy the bot token to `.env` as `TELEGRAM_BOT_TOKEN`
3. Get your Telegram user ID (use [@userinfobot](https://t.me/userinfobot))
4. Add your user ID to `.env` as `TELEGRAM_ADMIN_ID`

This will enable support form messages to be sent to you via Telegram.

### 7. Run the Frontend (Next.js)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. Build for Production

```bash
npm run build
npm start
```

## 📖 Usage Guide

### For Participants (No Account Needed)

1. Click the event link shared by the organizer
2. Click "Join This Event"
3. Enter your name and email address
4. View all expenses and your share
5. When the event closes, receive settlement instructions via email
6. If you joined by mistake, you can leave before the event is closed (as long as you haven't paid any expenses)

### For Organizers

1. Sign in with your email (magic link, no password)
2. Create a new event from your dashboard (select currency, add title and description)
3. Share the event link with participants
4. Add expenses as they occur
5. Close the event when ready to settle
6. Settlement calculations and emails are sent automatically
7. Mark payments as "paid" as people settle up
8. View payment statistics on the event page

## 🔒 Security

- **Password-based auth**: Passwords are hashed with bcrypt on the backend.
- **Email verification**: Users must verify their email before they can sign in.
- **JWT auth with httpOnly cookies**: Tokens are stored in httpOnly cookies and validated on the Express backend.
- **Backend authorization**: All event/expense/participant changes are guarded by backend checks (owner vs participant).
- **Environment variables**: Secrets (JWT secret, email creds) live only in `.env` / server config, never in the client bundle.

## 📱 Deployment

Pockets consists of:
- A **Next.js frontend** (in the repo root, `src/app`).
- An **Express + SQLite backend** (in `server/`).

### Production Deployment to pockets.uz

#### Step 1: Set Up Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Frontend Configuration
NEXT_PUBLIC_SITE_URL=https://pockets.uz
NEXT_PUBLIC_API_URL=https://api.pockets.uz

# Backend Configuration
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://pockets.uz
SITE_URL=https://pockets.uz
DATABASE_PATH=./data/pockets.db
JWT_SECRET=your-super-secret-jwt-key-generate-with-openssl-rand-hex-32

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_ID=your_telegram_chat_id

# Node Environment
NODE_ENV=production
```

**Important Notes:**
- Generate `JWT_SECRET` using: `openssl rand -hex 32`
- Use a Gmail App Password (not your regular password) for `EMAIL_PASS`
- Ensure `FRONTEND_URL` matches `NEXT_PUBLIC_SITE_URL` exactly
- Ensure `SITE_URL` matches `NEXT_PUBLIC_SITE_URL` for email links

#### Step 2: Deploy the Backend (Express + SQLite)

The backend can be hosted on:
- **VPS/Server**: Direct Node.js deployment
- **Railway/Render/Fly.io**: Platform-as-a-Service
- **Docker**: Containerized deployment

**On a VPS/Server:**

```bash
cd server
npm install --production
npm run migrate   # Initializes the SQLite schema
NODE_ENV=production npm start
```

**Key backend environment variables:**
- `PORT` – Port for the API (default: `3001`)
- `HOST` – Host to bind (use `0.0.0.0` for production, default: `localhost` for dev)
- `DATABASE_PATH` – Path to SQLite DB (use absolute path for production)
- `SITE_URL` – Public URL of frontend (`https://pockets.uz`)
- `FRONTEND_URL` – Origin allowed by CORS (`https://pockets.uz`)
- `JWT_SECRET` – Strong secret for signing JWTs (generate with `openssl rand -hex 32`)
- `EMAIL_USER` – Gmail address for SMTP
- `EMAIL_PASS` – Gmail App Password
- `EMAIL_FROM` – From address in emails

**Backend URL Options:**
- **Subdomain**: `https://api.pockets.uz` (recommended)
- **Same domain, different port**: `https://pockets.uz:3001` (requires port forwarding)
- **Different domain**: `https://backend.pockets.uz`

#### Step 3: Deploy the Frontend (Next.js)

The frontend can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify / Railway / Render**
- **Self-hosted** with Docker or Node.js

**On Vercel:**
1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables (see below)
4. Deploy

**Key frontend environment variables:**
- `NEXT_PUBLIC_SITE_URL` – Public URL (`https://pockets.uz`)
- `NEXT_PUBLIC_API_URL` – Backend API URL (`https://api.pockets.uz`)
- `TELEGRAM_BOT_TOKEN` (optional) – For admin support notifications
- `TELEGRAM_ADMIN_ID` (optional)

**Self-hosted:**
```bash
npm install --production
npm run build
NODE_ENV=production npm start
```

#### Step 4: Configure DNS and Reverse Proxy

**For subdomain setup (api.pockets.uz):**
1. Add A/AAAA record for `api.pockets.uz` pointing to your backend server IP
2. Configure reverse proxy (nginx/Apache) to forward requests to `localhost:3001`

**Example nginx configuration:**
```nginx
server {
    listen 80;
    server_name api.pockets.uz;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 5: SSL/HTTPS Setup

Use Let's Encrypt (Certbot) for free SSL certificates:

```bash
sudo certbot --nginx -d pockets.uz -d api.pockets.uz
```

Or use Cloudflare for DNS and SSL (free tier available).

#### Step 6: Verify Deployment

1. Check backend health: `curl https://api.pockets.uz/api/health`
2. Visit frontend: `https://pockets.uz`
3. Test signup/login flow
4. Verify email delivery
5. Test event creation and expense tracking

**Troubleshooting:**
- Ensure CORS on backend (`FRONTEND_URL`) matches frontend origin exactly
- Check that `SITE_URL` matches `NEXT_PUBLIC_SITE_URL` for email links
- Verify backend is accessible from frontend (check firewall/security groups)
- Ensure SQLite database directory has write permissions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC License - see LICENSE file for details

## 💬 Support

- **FAQ**: Visit [/faq](https://pockets.uz/faq) for common questions
- **Support Form**: Use the contact form on the homepage
- **Issues**: Open an issue on GitHub

---

Built with ❤️ by [Alisher Ortiqov](https://github.com/mcpeblocker) and [Kamoliddin Yulbarsov](https://github.com/KamoliddinCS) using Next.js and an Express + SQLite backend
